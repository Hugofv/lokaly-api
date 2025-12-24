/**
 * Cache Package
 *
 * Redis-based caching with strategic key management.
 * Provides cache invalidation patterns and TTL management.
 */

import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
}

export class CacheService {
  private redis: Redis;
  private defaultTTL: number;
  private keyPrefix: string;

  constructor(redisUrl?: string, defaultTTL: number = 300) {
    // Default to 5 minutes if not specified
    this.defaultTTL = defaultTTL;
    this.keyPrefix = 'lokaly:';

    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err: Error) => {
      console.error('[Cache] Redis error:', err);
    });

    this.redis.on('connect', () => {
      console.log('[Cache] Connected to Redis');
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key);
      const value = await this.redis.get(fullKey);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Cache] Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(
    key: string,
    value: unknown,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl ?? this.defaultTTL;
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serialized);
      } else {
        await this.redis.set(fullKey, serialized);
      }
    } catch (error) {
      console.error(`[Cache] Error setting key ${key}:`, error);
    }
  }

  /**
   * Delete single key
   */
  async delete(key: string, prefix?: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key, prefix);
      await this.redis.del(fullKey);
    } catch (error) {
      console.error(`[Cache] Error deleting key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string, prefix?: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, prefix);
      const stream = this.redis.scanStream({
        match: fullPattern,
        count: 100,
      });

      let deletedCount = 0;
      const keys: string[] = [];

      stream.on('data', (chunk: string[]) => {
        keys.push(...chunk);
      });

      stream.on('end', async () => {
        if (keys.length > 0) {
          deletedCount = await this.redis.del(...keys);
        }
      });

      // Wait for stream to end
      await new Promise<void>((resolve) => {
        stream.on('end', resolve);
      });

      if (keys.length > 0) {
        deletedCount = await this.redis.del(...keys);
      }

      return deletedCount;
    } catch (error) {
      console.error(`[Cache] Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache for a specific entity
   * Deletes all keys related to that entity
   */
  async invalidateEntity(
    entityType: string,
    entityId: number | string
  ): Promise<void> {
    const patterns = [
      `${entityType}:${entityId}`, // Single entity
      `${entityType}:${entityId}:*`, // Related data
      `list:${entityType}:*`, // List caches
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  /**
   * Invalidate all list caches for an entity type
   */
  async invalidateList(entityType: string): Promise<void> {
    await this.deletePattern(`list:${entityType}:*`);
  }

  /**
   * Check if key exists
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error(`[Cache] Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map((k) => this.buildKey(k, prefix));
      const values = await this.redis.mget(...fullKeys);
      return values.map((v: string | null) =>
        v ? (JSON.parse(v) as T) : null
      );
    } catch (error) {
      console.error(`[Cache] Error getting multiple keys:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once
   */
  async mset(
    entries: Array<{ key: string; value: unknown; ttl?: number }>,
    prefix?: string
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const entry of entries) {
        const fullKey = this.buildKey(entry.key, prefix);
        const serialized = JSON.stringify(entry.value);

        if (entry.ttl && entry.ttl > 0) {
          pipeline.setex(fullKey, entry.ttl, serialized);
        } else {
          pipeline.set(fullKey, serialized);
        }
      }

      await pipeline.exec();
    } catch (error) {
      console.error(`[Cache] Error setting multiple keys:`, error);
    }
  }

  /**
   * Increment a counter
   */
  async increment(
    key: string,
    by: number = 1,
    prefix?: string
  ): Promise<number> {
    try {
      const fullKey = this.buildKey(key, prefix);
      return await this.redis.incrby(fullKey, by);
    } catch (error) {
      console.error(`[Cache] Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get TTL of a key
   */
  async getTTL(key: string, prefix?: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key, prefix);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      console.error(`[Cache] Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string, customPrefix?: string): string {
    const prefix = customPrefix
      ? `${this.keyPrefix}${customPrefix}:`
      : this.keyPrefix;
    return `${prefix}${key}`;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Get Redis client (for advanced usage)
   */
  getClient(): Redis {
    return this.redis;
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

/**
 * Get or create cache instance
 */
export function getCache(redisUrl?: string, defaultTTL?: number): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService(redisUrl, defaultTTL);
  }
  return cacheInstance;
}
