/**
 * Cache Strategy Interface
 *
 * Defines the contract for all cache strategy implementations.
 * Supports memory, database, and future Redis implementations.
 */
export interface CacheStrategy {
  /**
   * Get cached value by key
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set cache value with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete cached value
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cached values
   */
  clear(): Promise<void>;

  /**
   * Check if key exists and is not expired
   */
  has(key: string): Promise<boolean>;

  /**
   * Get number of cached entries
   */
  size(): Promise<number>;
}
