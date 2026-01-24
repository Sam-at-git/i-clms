import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { SemanticChunkerService } from '../llm-parser/semantic-chunker.service';
import { RAGService } from '../rag/rag.service';
import { VectorStoreService } from '../vector-store/vector-store.service';

/**
 * 向量化方式枚举
 */
export enum VectorizationMethod {
  AUTO = 'AUTO', // RAG解析时自动
  MANUAL = 'MANUAL', // 手动触发
}

/**
 * 向量化结果
 */
export interface VectorizationResult {
  success: boolean;
  message: string;
  chunkCount?: number;
  vectorizedAt?: Date;
  error?: string;
}

/**
 * 批量向量化结果
 */
export interface BatchVectorizationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ contractId: string; error: string }>;
}

/**
 * 合同向量化服务
 *
 * 负责将合同文本分块并生成向量索引
 */
@Injectable()
export class ContractVectorizationService {
  private readonly logger = new Logger(ContractVectorizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunker: SemanticChunkerService,
    private readonly ragService: RAGService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  /**
   * 向量化单个合同
   *
   * @param contractId 合同ID
   * @param method 向量化方式（AUTO/MANUAL）
   * @param force 是否强制重新向量化
   * @returns 向量化结果
   */
  async vectorizeContract(
    contractId: string,
    method: VectorizationMethod = VectorizationMethod.MANUAL,
    force = false
  ): Promise<VectorizationResult> {
    try {
      // 获取合同信息
      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
        select: {
          id: true,
          markdownText: true,
          isVectorized: true,
        },
      });

      if (!contract) {
        throw new NotFoundException(`Contract ${contractId} not found`);
      }

      // 检查是否已向量化
      if (contract.isVectorized && !force) {
        return {
          success: false,
          message: 'Contract already vectorized',
        };
      }

      // 检查是否有markdown文本
      if (!contract.markdownText) {
        return {
          success: false,
          message: 'No markdown text available for vectorization',
          error: 'MARKDOWN_NOT_FOUND',
        };
      }

      this.logger.log(`[Vectorization] Starting vectorization for contract ${contractId}, method: ${method}`);

      // 分割文本为chunks
      const chunks = this.chunker.chunkBySemanticStructure(contract.markdownText, 500, 1000);
      this.logger.log(`[Vectorization] Created ${chunks.length} chunks from ${contract.markdownText.length} chars`);

      // 如果RAG服务不可用，直接返回错误
      if (!this.ragService.isAvailable()) {
        return {
          success: false,
          message: 'RAG service not available',
          error: 'RAG_NOT_AVAILABLE',
        };
      }

      // 删除旧的向量数据（如果force=true）
      if (force) {
        await this.vectorStore.deleteContractChunks(contractId);
        this.logger.log(`[Vectorization] Deleted old chunks for contract ${contractId}`);
      }

      // 使用RAGService进行向量索引
      await this.indexContractChunks(contractId, chunks);

      // 更新合同的向量化状态
      const now = new Date();
      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          isVectorized: true,
          vectorizedAt: now,
          vectorizationMethod: method,
          chunkCount: chunks.length,
        },
      });

      this.logger.log(`[Vectorization] Completed vectorization for contract ${contractId}: ${chunks.length} chunks`);

      return {
        success: true,
        message: 'Contract vectorized successfully',
        chunkCount: chunks.length,
        vectorizedAt: now,
      };
    } catch (error) {
      this.logger.error(`[Vectorization] Failed to vectorize contract ${contractId}:`, error);
      return {
        success: false,
        message: 'Vectorization failed',
        error: this.errorMessage(error),
      };
    }
  }

  /**
   * 批量向量化合同
   *
   * @param contractIds 合同ID列表
   * @param method 向量化方式
   * @param force 是否强制重新向量化
   * @returns 批量向量化结果
   */
  async batchVectorizeContracts(
    contractIds: string[],
    method: VectorizationMethod = VectorizationMethod.MANUAL,
    force = false
  ): Promise<BatchVectorizationResult> {
    const errors: Array<{ contractId: string; error: string }> = [];
    let processed = 0;
    let failed = 0;

    for (const contractId of contractIds) {
      const result = await this.vectorizeContract(contractId, method, force);
      processed++;

      if (!result.success) {
        failed++;
        errors.push({
          contractId,
          error: result.error || result.message,
        });
      }

      // 添加小延迟，避免过载
      await this.delay(100);
    }

    return {
      success: failed === 0,
      processed,
      failed,
      errors,
    };
  }

  /**
   * 移除合同的向量化数据
   *
   * @param contractId 合同ID
   * @returns 是否成功
   */
  async removeVectorization(contractId: string): Promise<boolean> {
    try {
      // 删除向量数据
      await this.vectorStore.deleteContractChunks(contractId);

      // 更新合同状态
      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          isVectorized: false,
          vectorizedAt: null,
          vectorizationMethod: null,
          chunkCount: 0,
        },
      });

      this.logger.log(`[Vectorization] Removed vectorization for contract ${contractId}`);
      return true;
    } catch (error) {
      this.logger.error(`[Vectorization] Failed to remove vectorization for contract ${contractId}:`, error);
      return false;
    }
  }

  /**
   * 检查合同是否可以向量化的条件
   *
   * @param contractId 合同ID
   * @returns 是否可以向量化及原因
   */
  async canVectorize(contractId: string): Promise<{ canVectorize: boolean; reason?: string }> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        markdownText: true,
        isVectorized: true,
      },
    });

    if (!contract) {
      return { canVectorize: false, reason: 'Contract not found' };
    }

    if (!contract.markdownText) {
      return { canVectorize: false, reason: 'No markdown text available' };
    }

    if (contract.isVectorized) {
      return { canVectorize: false, reason: 'Contract already vectorized' };
    }

    if (!this.ragService.isAvailable()) {
      return { canVectorize: false, reason: 'RAG service not available' };
    }

    return { canVectorize: true };
  }

  /**
   * 使用RAGService索引合同chunks
   *
   * 这是RAGService.indexContract的简化版本，直接使用chunks而非重新分割
   */
  private async indexContractChunks(contractId: string, chunks: Array<{ text: string; metadata?: any }>): Promise<void> {
    // 获取embedding客户端
    const embeddingClient = (this.ragService as any).embeddingClient;
    if (!embeddingClient) {
      throw new Error('Embedding client not available');
    }

    // 生成所有chunks的embeddings
    const chunkTexts = chunks.map(c => c.text);
    const embeddings = await embeddingClient.embedBatch(chunkTexts);

    // 保存chunks with embeddings到向量存储
    for (let i = 0; i < chunks.length; i++) {
      await this.vectorStore.saveContractChunk(
        {
          contractId,
          chunkIndex: i,
          content: chunks[i].text,
          chunkType: chunks[i].metadata?.type || 'other',
          metadata: chunks[i].metadata || {},
        },
        embeddings[i]
      );
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 提取错误信息
   */
  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
