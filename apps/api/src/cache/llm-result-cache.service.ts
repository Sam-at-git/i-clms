import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { createHash } from 'crypto';
import { MemoryCacheStrategy } from './strategies/memory-cache.strategy';

/**
 * LLM Result Cache Service
 *
 * L1 cache: In-memory cache for LLM responses
 * L2 cache: Database cache (llm_cache table)
 */
@Injectable()
export class LlmResultCacheService {
  private readonly logger = new Logger(LlmResultCacheService.name);
  private readonly L1_CACHE_PREFIX = 'llm:';
  private readonly L1_TTL = 60 * 60;  // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryCache: MemoryCacheStrategy,
  ) {}

  /**
   * Get cached LLM response
   */
  async getCachedResponse(
    prompt: string,
    input: string,
    modelName: string,
  ): Promise<string | null> {
    const promptHash = this.hashText(prompt + input);
    const l1Key = `${this.L1_CACHE_PREFIX}${promptHash}:${modelName}`;

    // L1: Memory cache
    const l1Result = await this.memoryCache.get<string>(l1Key);
    if (l1Result) {
      this.logger.debug(`L1 cache hit for LLM ${promptHash.slice(0, 8)}...`);
      return l1Result;
    }

    // L2: Database cache
    const dbResult = await this.prisma.$queryRaw<
      Array<{ response: string | null; expires_at: Date | null }>
    >`
      SELECT response, expires_at FROM llm_cache
      WHERE prompt_hash = ${promptHash} AND model_name = ${modelName}
    `;

    if (dbResult && dbResult.length > 0 && dbResult[0].response) {
      const row = dbResult[0];

      // Check expiration
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        await this.prisma.$executeRaw`
          DELETE FROM llm_cache WHERE prompt_hash = ${promptHash} AND model_name = ${modelName}
        `;
        return null;
      }

      this.logger.debug(`L2 cache hit for LLM ${promptHash.slice(0, 8)}...`);

      // Backfill L1 cache
      await this.memoryCache.set(l1Key, row.response, this.L1_TTL);

      return row.response;
    }

    return null;
  }

  /**
   * Cache LLM response
   */
  async cacheResponse(
    prompt: string,
    input: string,
    modelName: string,
    response: string,
    ttlDays = 30,
  ): Promise<void> {
    const promptHash = this.hashText(prompt + input);
    const l1Key = `${this.L1_CACHE_PREFIX}${promptHash}:${modelName}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    // L1: Memory cache
    await this.memoryCache.set(l1Key, response, this.L1_TTL);

    // L2: Database cache
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
