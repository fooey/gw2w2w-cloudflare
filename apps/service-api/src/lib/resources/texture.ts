import { Temporal } from '@js-temporal/polyfill';
import { isEmpty, withJitter } from '@repo/utils';
import type { CacheProviders } from '#lib/resources/index.ts';
import { CACHE_TTL, getEnableCacheLogging } from '#lib/resources/constants.ts';

export async function getTextureArrayBuffer(
  url: string | null,
  objectStore: CacheProviders['objectStore'],
): Promise<ArrayBuffer | null> {
  if (isEmpty(url)) return null;

  const OBJECT_KEY = 'textures:' + encodeURIComponent(url);

  let buffer: ArrayBuffer | null;
  const object = await objectStore.get(OBJECT_KEY);

  if (object === null) {
    if (getEnableCacheLogging()) console.info(`object MISS for ${OBJECT_KEY}`);

    const r = await fetch(url, { headers: { 'User-Agent': 'gw2w2w.com' } });
    if (!r.ok) return null;
    buffer = await r.arrayBuffer();

    await objectStore.put(OBJECT_KEY, buffer, {
      customMetadata: {
        expiresAt: Temporal.Now.instant()
          .add({ seconds: withJitter(CACHE_TTL.immutable.kv) })
          .toString(),
      },
    });
  } else {
    if (getEnableCacheLogging()) console.info(`object HIT for ${OBJECT_KEY}`);
    buffer = await object.arrayBuffer();
  }

  return buffer;
}
