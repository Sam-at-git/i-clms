import { Injectable } from '@nestjs/common';
import { MemoryCacheStrategy } from './strategies/memory-cache.strategy';
import { DocumentFingerprintService } from './document-fingerprint.service';
import { EmbeddingCacheService } from './embedding-cache.service';
import { LlmResultCacheService } from './llm-result-cache.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { CacheStats } from './dto/cache-config.dto';

/**
 * Cache Service
 *
 * Main entry point for multi-level caching operations.
 * Coordinates between L1 (memory) and L2 (database) caches.
 */
@Injectable()
export class CacheService {
  constructor(
    private readonly memoryCache: MemoryCacheStrategy,
    private readonly documentFingerprint: DocumentFingerprintService,
    private readonly embeddingCache: EmbeddingCacheService,
    private readonly llmCache: LlmResultCacheService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const memoryStats = this.memoryCache.getStats();
    const memorySize = await this.memoryCache.size();
    const vectorStats = await this.vectorStore.getVectorCacheStats();

    return {
      level1: {
        size: memorySize,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        hitRate: Math.round(memoryStats.hitRate * 10000) / 10000,
      },
      level2: {
        count: vectorStats.embeddingCacheCount,
      },
      level3: {
        count: vectorStats.llmCacheCount,
        expiredCount: 0,  // Not tracked separately
      },
    };
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    await this.memoryCache.clear();
    await this.documentFingerprint.clear();
    // Embedding and LLM caches in database are permanent, don't clear by default
  }

  /**
   * Clear expired cache entries
   */
  async cleanExpired(): Promise<{ llm: number; document: number }> {
    return this.vectorStore.cleanExpiredCache();
  }
}
