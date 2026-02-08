import type { CacheProviders } from '@/lib/resources';
import {
  enableCacheLogging,
  NOT_FOUND_CACHE_EXPIRATION,
  NOT_FOUND_CACHE_VALUE,
  STORE_KV_TTL,
  STORE_OBJECT_TTL,
} from './constants';

export interface CacheConfig {
  /** TTL for successful cache entries (seconds) */
  ttl?: number;
  /** TTL for NOT_FOUND cache entries (seconds) */
  notFoundTtl?: number;
  /** Enable/disable cache logging for this operation */
  enableLogging?: boolean;
}

/**
 * Generic cache wrapper for KV store pattern (individual items by key)
 *
 * @param key - Cache key
 * @param apiCall - Function that fetches data from API
 * @param cacheProviders - Cache providers (kvStore, objectStore)
 * @param config - Cache configuration options
 * @returns Cached or fresh data, null if not found
 */
export async function withKvCache<T>(
  key: string,
  apiCall: () => Promise<T>,
  cacheProviders: CacheProviders,
  config: CacheConfig = {},
): Promise<T | null> {
  const { kvStore } = cacheProviders;
  const { ttl = STORE_KV_TTL, notFoundTtl = NOT_FOUND_CACHE_EXPIRATION, enableLogging = enableCacheLogging } = config;

  // 1. Check cache
  const cached = await kvStore.get(key, 'text');

  if (cached !== null) {
    if (enableLogging) {
      console.log(`kv HIT for [${key}]`);
    }

    if (cached === NOT_FOUND_CACHE_VALUE) {
      return null;
    }

    return JSON.parse(cached) as T;
  }

  if (enableLogging) {
    console.log(`kv MISS for [${key}]`);
  }

  // 2. Fetch from API
  try {
    const freshData = await apiCall();

    // 3. Store in cache
    await kvStore.put(key, JSON.stringify(freshData), {
      expirationTtl: ttl,
    });

    return freshData;
  } catch (error) {
    // API returned an error, cache NOT_FOUND
    if (enableLogging) {
      console.log(`Caching NOT_FOUND for [${key}]`);
    }

    await kvStore.put(key, NOT_FOUND_CACHE_VALUE, {
      expirationTtl: notFoundTtl,
    });

    return null;
  }
}

/**
 * Generic cache wrapper for Object store pattern (collections in single file)
 *
 * @param objectKey - Object storage key (filename)
 * @param apiCall - Function that fetches data from API
 * @param cacheProviders - Cache providers (kvStore, objectStore)
 * @param config - Cache configuration options
 * @returns Cached or fresh data
 */
export async function withObjectCache<T>(
  objectKey: string,
  apiCall: () => Promise<T>,
  cacheProviders: CacheProviders,
  config: CacheConfig = {},
): Promise<T> {
  const { objectStore } = cacheProviders;
  const { ttl = STORE_OBJECT_TTL, enableLogging = enableCacheLogging } = config;

  // 1. Check cache with expiration
  let cachedData: T | null = null;
  const object = await objectStore.get(objectKey);

  if (object !== null) {
    const expiresAt = object.customMetadata?.expiresAt;
    if (expiresAt && new Date(expiresAt) > new Date()) {
      if (enableLogging) {
        console.log(`object HIT for ${objectKey}`);
      }
      cachedData = await object.json<T>();
    } else {
      if (enableLogging) {
        console.log(`object STALE for ${objectKey}`);
      }
    }
  } else {
    if (enableLogging) {
      console.log(`object MISS for ${objectKey}`);
    }
  }

  // 2. Fetch fresh data if cache miss or stale
  if (cachedData === null) {
    cachedData = await apiCall();

    // 3. Store with expiration metadata
    await objectStore.put(objectKey, JSON.stringify(cachedData), {
      customMetadata: {
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      },
    });
  }

  return cachedData;
}

/**
 * Wrapper for APIs that return arrays and need filtering by ID
 *
 * @param objectKey - Object storage key
 * @param ids - ID or array of IDs to filter by ('all' for everything)
 * @param apiCall - Function that fetches full array from API
 * @param cacheProviders - Cache providers
 * @param config - Cache configuration
 * @returns Filtered array based on requested IDs
 */
export async function withFilteredObjectCache<T extends { id: number }>(
  objectKey: string,
  ids: number | number[] | 'all',
  apiCall: () => Promise<T[]>,
  cacheProviders: CacheProviders,
  config: CacheConfig = {},
): Promise<T[]> {
  const allItems = await withObjectCache(objectKey, apiCall, cacheProviders, config);

  if (ids === 'all') {
    return allItems;
  }

  const idArray = Array.isArray(ids) ? ids : [ids];
  const idSet = new Set(idArray);

  return allItems.filter((item) => idSet.has(item.id));
}
