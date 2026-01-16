import {
  GW2Api,
  type ColorsDTO,
  type EmblemDTO,
  type GuildDTO,
} from 'guildwars2-ts';
import { z } from 'zod';
import type { CacheProviders } from '../server';

export type Guild = z.infer<typeof GuildDTO>;
export type EmblemBackground = z.infer<typeof EmblemDTO>[number];
export type EmblemForeground = z.infer<typeof EmblemDTO>[number];
export type Color = z.infer<typeof ColorsDTO>[number];

function getApi() {
  return new GW2Api({ inBrowser: false });
}

function getGuildFromApi(guildId: string): Promise<Guild> {
  return getApi().guild.get(guildId);
}

function getEmblemBackgroundFromApi(): Promise<EmblemBackground[]> {
  return getApi().emblem.get('backgrounds', 'all');
}

function getEmblemForegroundFromApi(): Promise<EmblemForeground[]> {
  return getApi().emblem.get('foregrounds', 'all');
}

function getColorFromApi(): Promise<Color[]> {
  return getApi().colors.get('all');
}

const NOT_FOUND_CACHE_EXPIRATION = 3600; // 1 hour
const NOT_FOUND_CACHE_VALUE = '__NOT_FOUND__';
const STORE_KV_TTL = 86400; // 24 hours
const STORE_OBJECT_TTL = 86400; // 24 hours
const enableCacheLogging = true;

export async function getGuild(
  guildId: string,
  cacheProviders: CacheProviders
): Promise<Guild | null> {
  const { kvStore } = cacheProviders;
  const KV_KEY = `guild:${guildId}`;

  // 1. Check cache
  const cached = await kvStore.get(KV_KEY, 'text');

  if (cached !== null) {
    if (enableCacheLogging) {
      console.log(`kv HIT for guild [${guildId}]`);
    }

    if (cached === NOT_FOUND_CACHE_VALUE) {
      return null;
    }

    return JSON.parse(cached) as Guild;
  }

  if (enableCacheLogging) {
    console.log(`kv MISS for guild [${guildId}]`);
  }

  // 2. Fetch from API if not in cache
  try {
    const freshGuild = await getGuildFromApi(guildId);

    // 3. Store in cache for 24 hours
    await kvStore.put(KV_KEY, JSON.stringify(freshGuild), {
      expirationTtl: STORE_KV_TTL,
    });

    return freshGuild;
  } catch (e) {
    // API returned an error, assume it's a 404.
    // A more robust solution would inspect the error type.
    if (enableCacheLogging) {
      console.log(`Caching NOT_FOUND for guild [${guildId}]`);
    }

    await kvStore.put(KV_KEY, NOT_FOUND_CACHE_VALUE, {
      expirationTtl: NOT_FOUND_CACHE_EXPIRATION,
    });

    return null;
  }
}

export async function getEmblemBackground(
  id: number | number[] | 'all',
  cacheProviders: CacheProviders
): Promise<EmblemBackground[]> {
  const { objectStore } = cacheProviders;
  const OBJECT_KEY = 'backgrounds.json';

  let allItems: EmblemBackground[] | null = null;
  const object = await objectStore.get(OBJECT_KEY);
  if (object !== null) {
    const expiresAt = object.customMetadata?.expiresAt;
    if (expiresAt && new Date(expiresAt) > new Date()) {
      if (enableCacheLogging) {
        console.log(`object HIT for ${OBJECT_KEY}`);
      }
      allItems = await object.json<EmblemBackground[]>();
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

  if (id === 'all') {
    return allItems;
  }

  const ids = Array.isArray(id) ? id : [id];
  const idSet = new Set(ids);

  return allItems.filter((item) => idSet.has(item.id));
}

export async function getEmblemForeground(
  id: number | number[] | 'all',
  cacheProviders: CacheProviders
): Promise<EmblemForeground[]> {
  const { objectStore } = cacheProviders;
  const OBJECT_KEY = 'foregrounds.json';

  let allItems: EmblemForeground[] | null = null;
  const object = await objectStore.get(OBJECT_KEY);
  if (object !== null) {
    const expiresAt = object.customMetadata?.expiresAt;
    if (expiresAt && new Date(expiresAt) > new Date()) {
      if (enableCacheLogging) {
        console.log(`object HIT for ${OBJECT_KEY}`);
      }
      allItems = await object.json<EmblemForeground[]>();
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

export async function getColor(
  id: number | number[] | 'all',
  cacheProviders: CacheProviders
): Promise<Color[]> {
  const { objectStore } = cacheProviders;
  const OBJECT_KEY = 'colors.json';

  let allItems: Color[] | null = null;
  const object = await objectStore.get(OBJECT_KEY);

  if (object !== null) {
    if (enableCacheLogging) console.log(`object HIT for ${OBJECT_KEY}`);
    allItems = await object.json<Color[]>();
  } else {
    if (enableCacheLogging) console.log(`object MISS for ${OBJECT_KEY}`);
    allItems = await getColorFromApi();
    await objectStore.put(OBJECT_KEY, JSON.stringify(allItems), {
      customMetadata: {
        expiresAt: new Date(Date.now() + STORE_OBJECT_TTL * 1000).toISOString(),
      },
    });
  }

  if (allItems === null) {
    return [];
  }

  const ids = Array.isArray(id) ? id : [id];
  const idSet = new Set(ids);

  return allItems.filter((item) => idSet.has(item.id));
}

export async function fetchBinaryAsBuffer(
  url: string | null,
  cacheProviders: CacheProviders
) {
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
