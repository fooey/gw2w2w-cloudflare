import type { Emblem } from '@service-api/lib/types';

const CACHE_NAME = 'gw2-textures-v1';
const STORAGE_KEY = 'gw2-textures-cached';

/** Returns the /api/texture proxy URL for a given GW2 render URL */
export function textureProxyUrl(gw2Url: string): string {
  return `/api/texture?url=${encodeURIComponent(gw2Url)}`;
}

/** Returns true if textures have been fully downloaded in a previous session */
export function isTextureCacheMarked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === CACHE_NAME;
  } catch {
    return false;
  }
}

function markTextureCacheComplete() {
  try {
    localStorage.setItem(STORAGE_KEY, CACHE_NAME);
  } catch {
    // ignore – private browsing mode
  }
}

export function clearTextureCacheMark() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Deletes all cached textures from the Cache API and clears the completion mark. */
export async function clearTextureCache(): Promise<void> {
  await caches.delete(CACHE_NAME);
  clearTextureCacheMark();
}

/**
 * Fetches a single texture via the proxy, storing it in the Cache API.
 * Returns the ArrayBuffer for immediate use.
 */
export async function fetchTexture(gw2Url: string): Promise<ArrayBuffer> {
  const proxyUrl = textureProxyUrl(gw2Url);
  const cache = await caches.open(CACHE_NAME);

  const existing = await cache.match(proxyUrl);
  if (existing) return existing.arrayBuffer();

  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error(`Texture fetch failed: ${response.status}`);

  // Clone before consuming — cache.put needs a fresh response
  await cache.put(proxyUrl, response.clone());
  return response.arrayBuffer();
}

export interface PrefetchProgress {
  completed: number;
  total: number;
}

/**
 * Downloads all emblem textures (backgrounds layer[0], foregrounds layers[1,2])
 * and stores them in the Cache API. Calls onProgress after each successful fetch.
 *
 * Already-cached entries are skipped without a network request.
 * Failed individual textures are tolerated (reported in the returned failedUrls array).
 */
export async function prefetchAllTextures(
  backgrounds: Emblem[],
  foregrounds: Emblem[],
  onProgress: (p: PrefetchProgress) => void,
): Promise<{ failedUrls: string[] }> {
  const cache = await caches.open(CACHE_NAME);
  const failedUrls: string[] = [];

  const urls: string[] = [
    ...backgrounds.flatMap((b) => (b.layers[0] ? [b.layers[0]] : [])),
    ...foregrounds.flatMap((f) => [f.layers[1], f.layers[2]].filter((l): l is string => !!l)),
  ];

  const total = urls.length;
  let completed = 0;

  const BATCH_SIZE = 20;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (gw2Url) => {
        const proxyUrl = textureProxyUrl(gw2Url);
        try {
          const existing = await cache.match(proxyUrl);
          if (!existing) {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`${response.status}`);
            await cache.put(proxyUrl, response);
          }
        } catch {
          failedUrls.push(gw2Url);
        }
        completed++;
        onProgress({ completed, total });
      }),
    );
  }

  if (failedUrls.length === 0) {
    markTextureCacheComplete();
  }

  return { failedUrls };
}
