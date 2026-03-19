import type { CacheProviders } from '@service-api/lib/resources';
import { getEnableCacheLogging, STORE_STATIC_OBJECT_TTL, withJitter } from '@service-api/lib/resources/constants';

export async function getTextureArrayBuffer(
  url: string | null,
  objectStore: CacheProviders['objectStore'],
): Promise<ArrayBuffer | null> {
  if (!url) return null;

  const OBJECT_KEY = 'textures:' + encodeURIComponent(url);

  let buffer: ArrayBuffer | null;
  const object = await objectStore.get(OBJECT_KEY);

  if (object !== null) {
    if (getEnableCacheLogging()) console.info(`object HIT for ${OBJECT_KEY}`);
    buffer = await object.arrayBuffer();
  } else {
    if (getEnableCacheLogging()) console.info(`object MISS for ${OBJECT_KEY}`);

    const r = await fetch(url);
    if (!r.ok) return null;
    buffer = await r.arrayBuffer();

    await objectStore.put(OBJECT_KEY, buffer, {
      customMetadata: {
        expiresAt: new Date(Date.now() + withJitter(STORE_STATIC_OBJECT_TTL * 1000)).toISOString(),
      },
    });
  }

  return buffer;
}
