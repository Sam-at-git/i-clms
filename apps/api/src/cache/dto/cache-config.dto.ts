/**
 * Cache Configuration
 *
 * Defines the configuration for multi-level caching strategy.
 */

export enum CacheProvider {
  MEMORY = 'memory',
  REDIS = 'redis',  // Future support
  DATABASE = 'database',
}

export interface CacheConfig {
  enabled: boolean;
  level1: {
    provider: CacheProvider;
    ttl: number;  // Seconds, default 7 days
  };
  level2: {
    enabled: boolean;
    tableName: string;  // embedding_cache
  };
  level3: {
    enabled: boolean;
    tableName: string;  // llm_cache
    ttl: number;  // Seconds, default 30 days
  };
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  level1: {
    provider: CacheProvider.MEMORY,
    ttl: 7 * 24 * 60 * 60,  // 7 days
  },
  level2: {
    enabled: true,
    tableName: 'embedding_cache',
  },
  level3: {
    enabled: true,
    tableName: 'llm_cache',
    ttl: 30 * 24 * 60 * 60,  // 30 days
  },
};

export interface CacheStats {
  level1: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  level2: {
    count: number;
  };
  level3: {
    count: number;
    expiredCount: number;
  };
}

export interface ParsedDocumentResult {
  fields: Record<string, unknown>;
  completeness: number;
  warnings: string[];
  strategy: string;
  parsedAt: Date;
}
