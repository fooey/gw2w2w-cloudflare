import { type CacheProviders } from '@/lib/resources';
import { enableCacheLogging, NOT_FOUND_CACHE_EXPIRATION, NOT_FOUND_CACHE_VALUE, STORE_KV_TTL } from './constants';
import { getApi } from '@/lib/resources/api';
import type { GuildDTO } from 'guildwars2-ts';
import { z } from 'zod';

export async function getGuild(guildId: string, cacheProviders: CacheProviders): Promise<Guild | null> {
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
export function getGuildFromApi(guildId: string): Promise<Guild> {
  return getApi().guild.get(guildId);
}
export type Guild = z.infer<typeof GuildDTO>;
