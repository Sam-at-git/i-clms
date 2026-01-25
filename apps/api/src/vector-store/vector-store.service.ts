import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { createHash } from 'crypto';

export interface EmbeddingCacheResult {
  embedding: number[];
  createdAt: Date;
}

export interface LlmCacheResult {
  response: string;
  createdAt: Date;
}

export interface ContractChunkData {
  contractId: string;
  chunkIndex: number;
  content: string;
  chunkType?: string;
  metadata?: Record<string, unknown>;
}

export interface ContractChunkResult {
  index: number;
  content: string;
  chunkType: string;
}

export interface SimilarChunkResult {
  contractId: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface CacheCleanupResult {
  llm: number;
  document: number;
}

/**
 * Vector Store Service
 *
 * Provides vector storage and caching capabilities using pgvector extension.
 * Supports embedding cache, LLM response cache, and contract chunk storage.
 *
 * @see Spec 22 - pgvector Foundation
 */
@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get cached embedding for text
   */
  async getCachedEmbedding(
    text: string,
    modelName: string,
  ): Promise<number[] | null> {
    const textHash = this.hashText(text);

    try {
      const cached = await this.prisma.$queryRaw<
        Array<{ embedding: number[] | null }>
      >`
        SELECT embedding FROM embedding_cache
        WHERE text_hash = ${textHash} AND model_name = ${modelName}
      `;

      if (cached && cached.length > 0 && cached[0].embedding) {
        this.logger.debug(`Embedding cache hit for ${textHash.slice(0, 8)}...`);
        return cached[0].embedding;
      }
    } catch (error) {
      this.logger.error(`Failed to get cached embedding: ${this.errorMessage(error)}`);
    }

    return null;
  }

  /**
   * Cache text embedding
   */
  async cacheEmbedding(
    text: string,
    modelName: string,
    embedding: number[],
  ): Promise<void> {
    const textHash = this.hashText(text);
    const embeddingStr = `[${embedding.join(',')}]`;

    try {
      await this.prisma.$executeRaw`
        INSERT INTO embedding_cache (text_hash, model_name, embedding, created_at, updated_at)
        VALUES (${textHash}, ${modelName}, ${embeddingStr}::vector, NOW(), NOW())
        ON CONFLICT (text_hash, model_name) DO UPDATE
        SET embedding = EXCLUDED.embedding, updated_at = NOW()
      `;
      this.logger.debug(`Cached embedding for ${textHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.error(`Failed to cache embedding: ${this.errorMessage(error)}`);
    }
  }

  /**
   * Get cached LLM response
   */
  async getCachedLlmResponse(
    prompt: string,
    input: string,
    modelName: string,
  ): Promise<string | null> {
    const promptHash = this.hashText(prompt + input);

    try {
      const cached = await this.prisma.$queryRaw<
        Array<{ response: string | null; expires_at: Date | null }>
      >`
        SELECT response, expires_at FROM llm_cache
        WHERE prompt_hash = ${promptHash} AND model_name = ${modelName}
      `;

      if (cached && cached.length > 0 && cached[0].response) {
        const expiresAt = cached[0].expires_at;
        if (!expiresAt || new Date(expiresAt) > new Date()) {
          this.logger.debug(`LLM cache hit for ${promptHash.slice(0, 8)}...`);
          return cached[0].response;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get cached LLM response: ${this.errorMessage(error)}`);
    }

    return null;
  }

  /**
   * Cache LLM response
   */
  async cacheLlmResponse(
    prompt: string,
    input: string,
    modelName: string,
    response: string,
    ttlDays = 30,
  ): Promise<void> {
    const promptHash = this.hashText(prompt + input);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    try {
      await this.prisma.$executeRaw`
        INSERT INTO llm_cache (prompt_hash, model_name, request, response, created_at, expires_at)
        VALUES (
          ${promptHash},
          ${modelName},
          ${input.slice(0, 1000)},
          ${response},
          NOW(),
          ${expiresAt}
        )
        ON CONFLICT (prompt_hash, model_name) DO UPDATE
        SET response = EXCLUDED.response, expires_at = EXCLUDED.expires_at
      `;
      this.logger.debug(`Cached LLM response for ${promptHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.error(`Failed to cache LLM response: ${this.errorMessage(error)}`);
    }
  }

  /**
   * Save contract chunk with embedding
   */
  async saveContractChunk(
    data: ContractChunkData,
    embedding: number[],
  ): Promise<void> {
    const embeddingStr = `[${embedding.join(',')}]`;

    try {
      await this.prisma.$executeRaw`
        INSERT INTO contract_chunks
        (contract_id, chunk_index, content, embedding, chunk_type, metadata, created_at, updated_at)
        VALUES (
          ${data.contractId},
          ${data.chunkIndex},
          ${data.content},
          ${embeddingStr}::vector,
          ${data.chunkType || 'other'},
          ${JSON.stringify(data.metadata || {})}::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT (contract_id, chunk_index) DO UPDATE
        SET content = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            chunk_type = EXCLUDED.chunk_type,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
      `;
      this.logger.debug(`Saved contract chunk ${data.chunkIndex} for contract ${data.contractId}`);
    } catch (error) {
      this.logger.error(`Failed to save contract chunk: ${this.errorMessage(error)}`);
      // 重新抛出错误，让调用者知道插入失败
      throw error;
    }
  }

  /**
   * Batch save contract chunks
   */
  async saveContractChunks(
    chunks: Array<ContractChunkData & { embedding: number[] }>,
  ): Promise<void> {
    for (const chunk of chunks) {
      await this.saveContractChunk(chunk, chunk.embedding);
    }
    this.logger.log(`Saved ${chunks.length} contract chunks`);
  }

  /**
   * Search similar chunks by vector similarity
   */
  async searchSimilarChunks(
    embedding: number[],
    limit = 5,
    threshold = 0.7,
  ): Promise<SimilarChunkResult[]> {
    const embeddingStr = `[${embedding.join(',')}]`;

    try {
      const results = await this.prisma.$queryRaw<
        Array<{ contract_id: string; content: string; similarity: number; metadata: Record<string, unknown> | null }>
      >`
        SELECT contract_id, content, metadata, 1 - (embedding <=> ${embeddingStr}::vector) AS similarity
        FROM contract_chunks
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}
      `;

      return results
        .filter(r => r.similarity >= threshold)
        .map(r => ({
          contractId: r.contract_id,
          content: r.content,
          similarity: r.similarity,
          metadata: r.metadata || undefined,
        }));
    } catch (error) {
      this.logger.error(`Failed to search similar chunks: ${this.errorMessage(error)}`);
      return [];
    }
  }

  /**
   * Get all chunks for a contract
   */
  async getContractChunks(contractId: string): Promise<ContractChunkResult[]> {
    try {
      const chunks = await this.prisma.$queryRaw<
        Array<{ chunk_index: number; content: string; chunk_type: string | null }>
      >`
        SELECT chunk_index, content, chunk_type
        FROM contract_chunks
        WHERE contract_id = ${contractId}
        ORDER BY chunk_index
      `;

      return chunks.map(c => ({
        index: c.chunk_index,
        content: c.content,
        chunkType: c.chunk_type || 'other',
      }));
    } catch (error) {
      this.logger.error(`Failed to get contract chunks: ${this.errorMessage(error)}`);
      return [];
    }
  }

  /**
   * Delete all chunks for a contract
   */
  async deleteContractChunks(contractId: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM contract_chunks
        WHERE contract_id = ${contractId}
      `;
      this.logger.log(`Deleted all chunks for contract ${contractId}`);
    } catch (error) {
      this.logger.error(`Failed to delete contract chunks: ${this.errorMessage(error)}`);
    }
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<CacheCleanupResult> {
    const now = new Date();

    try {
      const llmResult = await this.prisma.$executeRaw`
        DELETE FROM llm_cache WHERE expires_at < ${now}
      `;

      const docResult = await this.prisma.$executeRaw`
        DELETE FROM document_fingerprint WHERE expires_at < ${now}
      `;

      const result = {
        llm: Number(llmResult),
        document: Number(docResult),
      };

      this.logger.log(`Cleaned expired cache: ${result.llm} LLM entries, ${result.document} document entries`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to clean expired cache: ${this.errorMessage(error)}`);
      return { llm: 0, document: 0 };
    }
  }

  /**
   * Get vector cache statistics
   */
  async getVectorCacheStats(): Promise<{
    embeddingCacheCount: number;
    llmCacheCount: number;
    contractChunksCount: number;
  }> {
    try {
      const [embeddingResult, llmResult, chunksResult] = await Promise.all([
        this.prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM embedding_cache`,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM llm_cache`,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM contract_chunks`,
      ]);

      return {
        embeddingCacheCount: Number(embeddingResult[0]?.count || 0),
        llmCacheCount: Number(llmResult[0]?.count || 0),
        contractChunksCount: Number(chunksResult[0]?.count || 0),
      };
    } catch (error) {
      this.logger.error(`Failed to get vector cache stats: ${this.errorMessage(error)}`);
      return {
        embeddingCacheCount: 0,
        llmCacheCount: 0,
        contractChunksCount: 0,
      };
    }
  }

  /**
   * Check if pgvector extension is available
   */
  async checkPgVectorAvailable(): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{ available: boolean }>
      >`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) as available
      `;
      return result[0]?.available || false;
    } catch {
      return false;
    }
  }

  /**
   * Save document fingerprint cache
   */
  async saveDocumentFingerprint(
    fileHash: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    parseResult: Record<string, unknown>,
    strategy: string,
    ttlDays = 7,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    try {
      await this.prisma.$executeRaw`
        INSERT INTO document_fingerprint (file_hash, file_name, file_size, mime_type, parse_result, strategy, created_at, expires_at)
        VALUES (
          ${fileHash},
          ${fileName},
          ${fileSize},
          ${mimeType},
          ${JSON.stringify(parseResult)}::jsonb,
          ${strategy},
          NOW(),
          ${expiresAt}
        )
        ON CONFLICT (file_hash) DO UPDATE
        SET parse_result = EXCLUDED.parse_result,
            strategy = EXCLUDED.strategy,
            expires_at = EXCLUDED.expires_at
      `;
      this.logger.debug(`Saved document fingerprint for ${fileHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.error(`Failed to save document fingerprint: ${this.errorMessage(error)}`);
    }
  }

  /**
   * Get cached document fingerprint
   */
  async getDocumentFingerprint(fileHash: string): Promise<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    parseResult: Record<string, unknown>;
    strategy: string;
  } | null> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{
          file_name: string;
          file_size: number;
          mime_type: string;
          parse_result: unknown;
          strategy: string;
          expires_at: Date | null;
        }>
      >`
        SELECT file_name, file_size, mime_type, parse_result, strategy, expires_at
        FROM document_fingerprint
        WHERE file_hash = ${fileHash}
      `;

      if (result && result.length > 0) {
        const expiresAt = result[0].expires_at;
        if (!expiresAt || new Date(expiresAt) > new Date()) {
          return {
            fileName: result[0].file_name,
            fileSize: result[0].file_size,
            mimeType: result[0].mime_type,
            parseResult: result[0].parse_result as Record<string, unknown>,
            strategy: result[0].strategy,
          };
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get document fingerprint: ${this.errorMessage(error)}`);
    }

    return null;
  }

  /**
   * Compute SHA256 hash of text
   */
  private hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Extract error message safely
   */
  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
