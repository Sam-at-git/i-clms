import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { createHash } from 'crypto';
import { MemoryCacheStrategy } from './strategies/memory-cache.strategy';

/**
 * Embedding Cache Service
 *
 * L1 cache: In-memory cache for vector embeddings
 * L2 cache: Database cache (embedding_cache table)
 */
@Injectable()
export class EmbeddingCacheService {
  private readonly logger = new Logger(EmbeddingCacheService.name);
  private readonly L1_CACHE_PREFIX = 'embed:';
  private readonly L1_TTL = 7 * 24 * 60 * 60;  // 7 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryCache: MemoryCacheStrategy,
  ) {}

  /**
   * Get cached vector embedding
   */
  async getCachedEmbedding(
    text: string,
    modelName: string,
  ): Promise<number[] | null> {
    const textHash = this.hashText(text);
    const l1Key = `${this.L1_CACHE_PREFIX}${textHash}:${modelName}`;

    // L1: Memory cache
    const l1Result = await this.memoryCache.get<number[]>(l1Key);
    if (l1Result) {
      this.logger.debug(`L1 cache hit for embedding ${textHash.slice(0, 8)}...`);
      return l1Result;
    }

    // L2: Database cache
    const dbResult = await this.prisma.$queryRaw<
      Array<{ embedding: number[] | null }>
    >`
      SELECT embedding FROM embedding_cache
      WHERE text_hash = ${textHash} AND model_name = ${modelName}
    `;

    if (dbResult && dbResult.length > 0 && dbResult[0].embedding) {
      this.logger.debug(`L2 cache hit for embedding ${textHash.slice(0, 8)}...`);

      const embedding = dbResult[0].embedding;

      // Backfill L1 cache
      await this.memoryCache.set(l1Key, embedding, this.L1_TTL);

      return embedding;
    }

    return null;
  }

  /**
   * Cache vector embedding
   */
  async cacheEmbedding(
    text: string,
    modelName: string,
    embedding: number[],
  ): Promise<void> {
    const textHash = this.hashText(text);
    const l1Key = `${this.L1_CACHE_PREFIX}${textHash}:${modelName}`;
    const embeddingStr = `[${embedding.join(',')}]`;

    // L1: Memory cache
    await this.memoryCache.set(l1Key, embedding, this.L1_TTL);

    // L2: Database cache (permanent unless manually cleaned)
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

  private hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
