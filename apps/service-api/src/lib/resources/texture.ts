import type { CacheProviders } from '@api/lib/resources';
import { enableCacheLogging, STORE_OBJECT_TTL } from '@api/lib/resources/constants';

export async function getTextureArrayBuffer(
  url: string | null,
  objectStore: CacheProviders['objectStore'],
): Promise<ArrayBuffer | null> {
  if (!url) return null;

  const OBJECT_KEY = 'textures:' + encodeURIComponent(url);

  let buffer: ArrayBuffer | null = null;
  const object = await objectStore.get(OBJECT_KEY);

  if (object !== null) {
    if (enableCacheLogging) console.log(`object HIT for ${OBJECT_KEY}`);
    buffer = await object.arrayBuffer();
  } else {
    if (enableCacheLogging) console.log(`object MISS for ${OBJECT_KEY}`);

    const r = await fetch(url);
    if (!r.ok) return null;
    buffer = await r.arrayBuffer();

    // await objectStore.put(OBJECT_KEY, buffer, {
    //   customMetadata: {
    //     expiresAt: new Date(Date.now() + STORE_OBJECT_TTL * 1000).toISOString(),
    //   },
    // });
  }

  return buffer;
}
