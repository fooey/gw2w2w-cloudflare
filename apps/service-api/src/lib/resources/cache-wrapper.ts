import { Temporal } from '@js-temporal/polyfill';
import { withJitter } from '@repo/utils';
import { type CacheProviders } from '#lib/resources/index.ts';
import { GW2RateLimitError } from '#lib/resources/api.ts';
import { CACHE_TTL, getEnableCacheLogging, NOT_FOUND_CACHE_VALUE } from './constants';

export interface CacheConfig {
  /** TTL for successful cache entries (seconds) */
  ttl?: number;
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
  const { ttl = CACHE_TTL.patch.kv, enableLogging = getEnableCacheLogging } = config;

  // 1. Check cache
  const cached = await kvStore.get(key, 'text');

  if (cached !== null) {
    if (enableLogging) {
      console.info(`kv HIT for [${key}]`);
    }

    if (cached === NOT_FOUND_CACHE_VALUE) {
      return null;
    }

    return JSON.parse(cached) as T;
  }

  if (enableLogging) {
    console.info(`kv MISS for [${key}]`);
  }

  // 2. Fetch from API
  if (enableLogging) {
    console.info(`kv fetching [${key}]`);
  }
  try {
    const freshData = await apiCall();

    if (enableLogging) {
      console.info(`kv fetch [${key}] → ok`);
    }

    // 3. Store in cache
    await kvStore.put(key, JSON.stringify(freshData), {
      expirationTtl: withJitter(ttl),
    });

    return freshData;
  } catch (error) {
    if (error instanceof GW2RateLimitError) {
      console.warn(`kv fetch [${key}] → 429: skipping cache write`);
    } else {
      // Transient API errors (5xx, network failures) — do not poison the cache.
      // The next request will retry. Caching NOT_FOUND here would silently drop
      // valid resources for up to notFoundTtl (e.g. 1 hour) on patch day.
      console.warn(`kv fetch [${key}] → error: skipping cache write:`, error);
    }
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
  const { ttl = CACHE_TTL.patch.kv, enableLogging = getEnableCacheLogging } = config;

  // 1. Check cache with expiration
  let cachedData: T | null = null;
  let staleData: T | null = null;
  const object = await objectStore.get(objectKey);

  if (object !== null) {
    const expiresAt = object.customMetadata?.expiresAt;
    if (expiresAt && Temporal.Instant.compare(Temporal.Instant.from(expiresAt), Temporal.Now.instant()) > 0) {
      if (enableLogging) {
        console.info(`object HIT for ${objectKey}`);
      }
      cachedData = await object.json<T>();
    } else {
      if (enableLogging) {
        console.info(`object STALE for ${objectKey}`);
      }
      // Retain stale data as fallback in case the API is rate-limited.
      staleData = await object.json<T>();
    }
  } else {
    if (enableLogging) {
      console.info(`object MISS for ${objectKey}`);
    }
  }

  // 2. Fetch fresh data if cache miss or stale
  if (cachedData === null) {
    if (enableLogging) {
      console.info(`object fetching [${objectKey}]`);
    }
    try {
      cachedData = await apiCall();
      if (enableLogging) {
        console.info(`object fetch [${objectKey}] → ok`);
      }
    } catch (error) {
      if (error instanceof GW2RateLimitError && staleData !== null) {
        // Serve stale data rather than letting the request fail.
        console.warn(`object fetch [${objectKey}] → 429: serving stale data`);
        return staleData;
      }
      if (enableLogging) {
        console.warn(`object fetch [${objectKey}] → error:`, error);
      }
      throw error;
    }

    // 3. Store with expiration metadata
    await objectStore.put(objectKey, JSON.stringify(cachedData), {
      customMetadata: {
        expiresAt: Temporal.Now.instant()
          .add({ seconds: withJitter(ttl) })
          .toString(),
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
export async function withFilteredObjectCache<T extends { id: number | string }>(
  objectKey: string,
  ids: number | number[] | string | string[],
  apiCall: () => Promise<T[] | null>,
  cacheProviders: CacheProviders,
  config: CacheConfig = {},
): Promise<T[]> {
  const allItems = (await withObjectCache(objectKey, apiCall, cacheProviders, config)) ?? [];

  if (ids === 'all') {
    return allItems;
  }

  const idArray = Array.isArray(ids) ? ids : [ids];
  const idSet = new Set(idArray);

  return allItems.filter((item) => idSet.has(item.id));
}
