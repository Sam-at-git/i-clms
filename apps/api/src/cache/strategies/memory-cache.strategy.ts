import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CacheStrategy } from './cache-strategy.interface';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * Memory Cache Strategy
 *
 * In-memory cache implementation with TTL support.
 * Automatically cleans up expired entries.
 */
@Injectable()
export class MemoryCacheStrategy implements CacheStrategy, OnModuleDestroy {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly hits = new Map<string, number>();
  private readonly misses = new Map<string, number>();
  private readonly logger = new Logger(MemoryCacheStrategy.name);
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every hour
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.trackMiss(key);
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.trackMiss(key);
      return null;
    }

    this.trackHit(key);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: ttl ? Date.now() + ttl * 1000 : null,
    };
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hits.clear();
    this.misses.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  async size(): Promise<number> {
    this.cleanup();
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(key?: string): { hits: number; misses: number; hitRate: number } {
    if (key) {
      const hits = this.hits.get(key) || 0;
      const misses = this.misses.get(key) || 0;
      return {
        hits,
        misses,
        hitRate: hits + misses > 0 ? hits / (hits + misses) : 0,
      };
    }

    const totalHits = Array.from(this.hits.values()).reduce((a, b) => a + b, 0);
    const totalMisses = Array.from(this.misses.values()).reduce((a, b) => a + b, 0);
    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0,
    };
  }

  /**
   * Clear entries matching a prefix
   */
  async clearPrefix(prefix: string): Promise<number> {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  private trackHit(key: string): void {
    const current = this.hits.get(key) || 0;
    this.hits.set(key, current + 1);
  }

  private trackMiss(key: string): void {
    const current = this.misses.get(key) || 0;
    this.misses.set(key, current + 1);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
