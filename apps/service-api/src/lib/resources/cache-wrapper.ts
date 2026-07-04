import { GW2RateLimitError } from '#lib/resources/api.ts';
import type { CacheProviders } from '#lib/resources/index.ts';
import { Temporal } from '@js-temporal/polyfill';
import { withJitter } from '@repo/utils';
import { CACHE_TTL, getEnableCacheLogging, NOT_FOUND_CACHE_VALUE } from './constants';

// Module-scope in-flight registries for request coalescing.
// Within a single Worker isolate, concurrent requests for the same cache key
// share one in-flight Promise rather than each racing to call the upstream API.
// Entries are deleted as soon as the shared Promise settles (hit or miss).
const kvInflight = new Map<string, Promise<unknown>>();
const kvInflightWaiters = new Map<string, number>();
const objectInflight = new Map<string, Promise<unknown>>();
const objectInflightWaiters = new Map<string, number>();

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

    // Generic cache layer trusts that data previously cached under this key matches T.
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    return JSON.parse(cached) as T;
  }

  if (enableLogging) {
    console.info(`kv MISS for [${key}]`);
  }

  // 2. Fetch from API — coalesce concurrent misses so only one call goes upstream.
  if (enableLogging) {
    console.info(`kv fetching [${key}]`);
  }

  // coalesce concurrent misses per key to prevent thundering herd
  const existing = kvInflight.get(key);
  if (existing) {
    kvInflightWaiters.set(key, (kvInflightWaiters.get(key) ?? 0) + 1);
    if (enableLogging) console.info(`kv coalesced [${key}]`);
    // In-flight promises are keyed the same as the cache itself, so this always resolves to T | null.
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    return (await existing) as T | null;
  }

  const inflight = (async () => {
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
      const waiters = kvInflightWaiters.get(key) ?? 0;
      const coalition = waiters > 0 ? ` (+ ${waiters} coalesced)` : '';
      if (error instanceof GW2RateLimitError) {
        console.warn(`kv fetch [${key}] → 429: skipping cache write${coalition}`);
      } else {
        // Transient API errors (5xx, network failures) — do not poison the cache.
        // The next request will retry. Caching NOT_FOUND here would silently drop
        // valid resources for up to notFoundTtl (e.g. 1 hour) on patch day.
        console.warn(`kv fetch [${key}] → error: skipping cache write${coalition}:`, error);
      }
      return null;
    } finally {
      kvInflight.delete(key);
      kvInflightWaiters.delete(key);
    }
  })();

  kvInflight.set(key, inflight);
  return inflight;
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

  // 2. Fetch fresh data if cache miss or stale — coalesce concurrent misses.
  if (cachedData === null) {
    if (enableLogging) {
      console.info(`object fetching [${objectKey}]`);
    }

    // coalesce concurrent misses per key to prevent thundering herd
    const existing = objectInflight.get(objectKey);
    if (existing) {
      objectInflightWaiters.set(objectKey, (objectInflightWaiters.get(objectKey) ?? 0) + 1);
      if (enableLogging) console.info(`object coalesced [${objectKey}]`);
      // In-flight promises are keyed the same as the cache itself, so this always resolves to T.
      // eslint-disable-next-line typescript/no-unsafe-type-assertion
      cachedData = (await existing) as T;
    } else {
      const inflight = (async () => {
        try {
          const data = await apiCall();
          if (enableLogging) {
            console.info(`object fetch [${objectKey}] → ok`);
          }
          // 3. Store with expiration metadata
          await objectStore.put(objectKey, JSON.stringify(data), {
            customMetadata: {
              expiresAt: Temporal.Now.instant()
                .add({ seconds: withJitter(ttl) })
                .toString(),
            },
          });
          return data;
        } catch (error) {
          const waiters = objectInflightWaiters.get(objectKey) ?? 0;
          const coalition = waiters > 0 ? ` (+ ${waiters} coalesced)` : '';
          if (error instanceof GW2RateLimitError && staleData !== null) {
            // Serve stale data rather than letting the request fail.
            console.warn(`object fetch [${objectKey}] → 429: serving stale data${coalition}`);
            return staleData;
          }
          if (enableLogging) {
            console.warn(`object fetch [${objectKey}] → error${coalition}:`, error);
          }
          throw error;
        } finally {
          objectInflight.delete(objectKey);
          objectInflightWaiters.delete(objectKey);
        }
      })();

      objectInflight.set(objectKey, inflight);
      cachedData = await inflight;
    }
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
