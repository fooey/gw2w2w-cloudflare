import type { CacheProviders } from '@/lib/resources';
import { getApi } from '@/lib/resources/api';
import { enableCacheLogging, STORE_OBJECT_TTL } from '@/lib/resources/constants';
import type { EmblemDTO } from 'guildwars2-ts';
import { z } from 'zod';

export type Emblem = z.infer<typeof EmblemDTO>[number];

function getEmblemBackgroundFromApi(): Promise<Emblem[]> {
  return getApi().emblem.get('backgrounds', 'all');
}

function getEmblemForegroundFromApi(): Promise<Emblem[]> {
  return getApi().emblem.get('foregrounds', 'all');
}

export async function getEmblemBackground(
  emblemId: number | number[] | 'all',
  cacheProviders: CacheProviders,
): Promise<Emblem[]> {
  console.log(`🚀 ~ Emblem.ts ~ getEmblemBackground ~ emblemId:`, emblemId);

  const { objectStore } = cacheProviders;
  const OBJECT_KEY = 'backgrounds.json';

  let allItems: Emblem[] | null = null;
  const object = await objectStore.get(OBJECT_KEY);
  if (object !== null) {
    const expiresAt = object.customMetadata?.expiresAt;
    if (expiresAt && new Date(expiresAt) > new Date()) {
      if (enableCacheLogging) {
        console.log(`object HIT for ${OBJECT_KEY}`);
      }
      allItems = await object.json<Emblem[]>();
    } else {
      if (enableCacheLogging) {
        console.log(`object STALE for ${OBJECT_KEY}`);
      }
    }
  } else {
    if (enableCacheLogging) {
      console.log(`object MISS for ${OBJECT_KEY}`);
    }
  }

  if (allItems === null) {
    allItems = await getEmblemBackgroundFromApi();
    await objectStore.put(OBJECT_KEY, JSON.stringify(allItems), {
      customMetadata: {
        expiresAt: new Date(Date.now() + STORE_OBJECT_TTL * 1000).toISOString(),
      },
    });
  }

  if (emblemId === 'all') {
    return allItems;
  }

  const ids = Array.isArray(emblemId) ? emblemId : [emblemId];
  const idSet = new Set(ids);

  return allItems.filter((item) => idSet.has(item.id));
}

export async function getEmblemForeground(
  id: number | number[] | 'all',
  cacheProviders: CacheProviders,
): Promise<Emblem[]> {
  const { objectStore } = cacheProviders;
  const OBJECT_KEY = 'foregrounds.json';

  let allItems: Emblem[] | null = null;
  const object = await objectStore.get(OBJECT_KEY);
  if (object !== null) {
    const expiresAt = object.customMetadata?.expiresAt;
    if (expiresAt && new Date(expiresAt) > new Date()) {
      if (enableCacheLogging) {
        console.log(`object HIT for ${OBJECT_KEY}`);
      }
      allItems = await object.json<Emblem[]>();
    } else {
      if (enableCacheLogging) {
        console.log(`object STALE for ${OBJECT_KEY}`);
      }
    }
  } else {
    if (enableCacheLogging) {
      console.log(`object MISS for ${OBJECT_KEY}`);
    }
  }

  if (allItems === null) {
    allItems = await getEmblemForegroundFromApi();
    await objectStore.put(OBJECT_KEY, JSON.stringify(allItems), {
      customMetadata: {
        expiresAt: new Date(Date.now() + STORE_OBJECT_TTL * 1000).toISOString(),
      },
    });
  }

  if (id === 'all') {
    return allItems;
  }

  const ids = Array.isArray(id) ? id : [id];
  const idSet = new Set(ids);

  return allItems.filter((item) => idSet.has(item.id));
}

export async function fetchBinaryAsBuffer(url: string | null, cacheProviders: CacheProviders) {
  const { objectStore } = cacheProviders;
  if (!url) return null;

  const pathname = new URL(url).pathname.replaceAll('/', ':');
  const OBJECT_KEY = `texture:${pathname}`;

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

    await objectStore.put(OBJECT_KEY, buffer, {
      customMetadata: {
        expiresAt: new Date(Date.now() + STORE_OBJECT_TTL * 1000).toISOString(),
      },
    });
  }

  return buffer;
}
