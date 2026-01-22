import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingClient } from './embedding/embedding-client.interface';
import { OllamaEmbeddingClient } from './embedding/ollama-embedding.client';
import { OpenAIEmbeddingClient } from './embedding/openai-embedding.client';
import { SemanticChunkerService, SemanticChunk } from '../llm-parser/semantic-chunker.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { TopicRegistryService } from '../llm-parser/topics/topic-registry.service';
import {
  EmbeddingModelConfig,
  EMBEDDING_MODELS,
  EmbeddingProvider,
} from './dto/embedding-config.dto';
import { RAGOptions } from './dto/rag-options.dto';

/**
 * Topic query for RAG extraction
 */
export interface TopicQuery {
  topic: string;
  query: string;
  topK?: number;
  threshold?: number;
}

/**
 * RAG extraction result
 */
export interface RAGExtractResult {
  topic: string;
  query: string;
  retrievedChunks: Array<{
    content: string;
    similarity: number;
  }>;
  extractedData: Record<string, unknown>;
}

/**
 * RAG Service
 *
 * Core service for Retrieval-Augmented Generation based contract parsing.
 * Integrates embedding models, semantic chunking, and vector similarity search.
 *
 * @see Spec 26 - RAG Vector Search Strategy
 */
@Injectable()
export class RAGService implements OnModuleInit {
  private readonly logger = new Logger(RAGService.name);
  private embeddingClient: EmbeddingClient | null = null;
  private currentConfig: EmbeddingModelConfig | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly chunker: SemanticChunkerService,
    private readonly vectorStore: VectorStoreService,
    private readonly topicRegistry: TopicRegistryService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeEmbeddingClient();
  }

  /**
   * Initialize embedding client based on configuration
   */
  async initializeEmbeddingClient(): Promise<void> {
    const modelName = this.config.get('EMBEDDING_MODEL') || 'nomic-embed-text';
    const config = EMBEDDING_MODELS[modelName];

    if (!config) {
      this.logger.warn(`No embedding model config found for ${modelName}`);
      return;
    }

    try {
      switch (config.provider) {
        case EmbeddingProvider.OLLAMA:
          this.embeddingClient = new OllamaEmbeddingClient(config, this.config);
          break;
        case EmbeddingProvider.OPENAI:
          const apiKey = this.config.get('OPENAI_API_KEY');
          this.embeddingClient = new OpenAIEmbeddingClient({ ...config, apiKey });
          break;
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }

      // Test connection
      const connected = await this.embeddingClient.testConnection();
      if (connected) {
        this.currentConfig = config;
        this.logger.log(
          `Embedding client initialized: ${modelName} (${config.dimensions}d via ${config.provider})`,
        );
      } else {
        this.logger.warn(`Embedding model ${modelName} not available`);
        this.embeddingClient = null;
      }
    } catch (error) {
      this.logger.error(`Failed to initialize embedding client: ${this.errorMessage(error)}`);
      this.embeddingClient = null;
    }
  }

  /**
   * Generate vector index for a contract
   */
  async indexContract(contractId: number, content: string): Promise<void> {
    if (!this.embeddingClient) {
      throw new Error('Embedding client not available');
    }

    this.logger.log(`Indexing contract ${contractId}: ${content.length} chars`);

    // Chunk the document
    const chunks = this.chunker.chunkBySemanticStructure(content);

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map(c => c.text);
    const embeddings = await this.embeddingClient.embedBatch(chunkTexts);

    // Save chunks with embeddings to vector store
    for (let i = 0; i < chunks.length; i++) {
      await this.vectorStore.saveContractChunk(
        {
          contractId,
          chunkIndex: chunks[i].metadata.priority || i,
          content: chunks[i].text,
          chunkType: chunks[i].metadata.type,
          metadata: {
            type: chunks[i].metadata.type,
            title: chunks[i].metadata.title,
            articleNumber: chunks[i].metadata.articleNumber,
            priority: chunks[i].metadata.priority,
            fieldRelevance: chunks[i].metadata.fieldRelevance,
          },
        },
        embeddings[i],
      );
    }

    this.logger.log(`Indexed contract ${contractId}: ${chunks.length} chunks`);
  }

  /**
   * Extract information by topic using RAG
   */
  async extractByTopic(
    contractId: number,
    queries: TopicQuery[],
  ): Promise<RAGExtractResult[]> {
    if (!this.embeddingClient) {
      throw new Error('Embedding client not available');
    }

    const results: RAGExtractResult[] = [];

    for (const { topic, query, topK = 3, threshold = 0.7 } of queries) {
      // Generate query embedding
      const queryEmbedding = await this.embeddingClient.embed(query);

      // Search for similar chunks
      const similarChunks = await this.vectorStore.searchSimilarChunks(
        queryEmbedding,
        topK,
        threshold,
      );

      // Filter by contract ID if specified
      const contractChunks =
        contractId > 0
          ? similarChunks.filter(c => c.contractId === contractId || contractId === 0)
          : similarChunks;

      // Extract fields from retrieved chunks
      const extractedData = await this.extractFieldsFromChunks(
        topic,
        contractChunks.map(c => c.content),
      );

      results.push({
        topic,
        query,
        retrievedChunks: contractChunks.map(c => ({
          content: c.content,
          similarity: c.similarity,
        })),
        extractedData,
      });
    }

    return results;
  }

  /**
   * Extract fields from retrieved chunks
   */
  private async extractFieldsFromChunks(
    topic: string,
    chunks: string[],
  ): Promise<Record<string, unknown>> {
    const topicDef = this.topicRegistry.getTopic(topic);
    const result: Record<string, unknown> = {};
    const combinedText = chunks.join('\n\n---\n\n');

    // Simple regex-based field extraction
    for (const field of topicDef.fields) {
      const pattern = this.getFieldPattern(field.name);
      const match = combinedText.match(pattern);

      if (match && match[1]) {
        result[field.name] = this.transformFieldValue(field.name, match[1]);
      }
    }

    return result;
  }

  /**
   * Get regex pattern for field extraction
   */
  private getFieldPattern(fieldName: string): RegExp {
    const patterns: Record<string, RegExp> = {
      contractNo: /合同编号[：:]\s*([^\n]+)/,
      contractName: /合同名称[：:]\s*([^\n]+)/,
      partyA: /甲方[：:]\s*([^\n]+)/,
      partyB: /乙方[：:]\s*([^\n]+)/,
      contractAmount: /合同金额[：:]\s*[¥￥]?\s*([0-9,]+\.?\d*)/,
      signedDate: /签订日期[：:]\s*([0-9]{4}[-年][0-9]{1,2}[-月][0-9]{1,2})/,
      amountWithTax: /含税金额[：:]\s*[¥￥]?\s*([0-9,]+\.?\d*)/,
      amountWithoutTax: /不含税金额[：:]\s*[¥￥]?\s*([0-9,]+\.?\d*)/,
      taxRate: /税率[：:]\s*([0-9.]+%?)/,
      effectiveAt: /生效日期[：:]\s*([0-9]{4}[-年][0-9]{1,2}[-月][0-9]{1,2})/,
      expiresAt: /终止日期[：:]\s*([0-9]{4}[-年][0-9]{1,2}[-月][0-9]{1,2})/,
    };

    return patterns[fieldName] || new RegExp(`${fieldName}[：:]\\s*([^\\n]+)`);
  }

  /**
   * Transform field value to appropriate type
   */
  private transformFieldValue(fieldName: string, value: string): unknown {
    if (
      fieldName.includes('Amount') ||
      fieldName === 'contractAmount' ||
      fieldName.includes('amount')
    ) {
      return parseFloat(value.replace(/,/g, ''));
    }
    if (fieldName.includes('Rate') || fieldName === 'taxRate') {
      return parseFloat(value.replace(/%/g, ''));
    }
    return value.trim();
  }

  /**
   * Check if RAG service is available
   */
  isAvailable(): boolean {
    return this.embeddingClient !== null;
  }

  /**
   * Get current embedding model configuration
   */
  getCurrentConfig(): { name: string; config: EmbeddingModelConfig } | null {
    if (!this.currentConfig) {
      return null;
    }
    const name = Object.keys(EMBEDDING_MODELS).find(
      key => EMBEDDING_MODELS[key].model === this.currentConfig?.model,
    );
    return name ? { name, config: this.currentConfig } : null;
  }

  /**
   * Test connection to an embedding model
   */
  async testConnection(modelConfig: EmbeddingModelConfig): Promise<boolean> {
    let client: EmbeddingClient;

    try {
      switch (modelConfig.provider) {
        case EmbeddingProvider.OLLAMA:
          client = new OllamaEmbeddingClient(modelConfig, this.config);
          break;
        case EmbeddingProvider.OPENAI:
          if (!modelConfig.apiKey) {
            return false;
          }
          client = new OpenAIEmbeddingClient(modelConfig);
          break;
        default:
          return false;
      }

      return await client.testConnection();
    } catch {
      return false;
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
