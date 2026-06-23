import { normalizeGuildName, validateArenaNetUuid } from '@repo/utils';
import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import type { Guild } from '#lib/types/Guild.ts';
import { withKvCache, withObjectCache } from './cache-wrapper';
import { CACHE_TTL } from './constants';

export async function getGuildFromApi(guildId: string, env: CloudflareEnv): Promise<Guild | null> {
  const response = await apiFetch(env, `/guild/${guildId}`);
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Guild not found
    } else {
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
  }
  return response.json();
}

export async function searchGuildFromApi(name: string, env: CloudflareEnv): Promise<Guild['id'] | null> {
  const response = await apiFetch(env, `/guild/search?name=${encodeURIComponent(name)}`);
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Guild not found
    } else {
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
  }

  const result = await response.json();

  if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'string') {
    const guildId = result[0];

    if (typeof guildId !== 'string' || !validateArenaNetUuid(guildId)) {
      return null;
    }
    return guildId;
  }

  return null;
}

function getGuildNameKey(name: string): string {
  return `guild-name:${normalizeGuildName(name)}`;
}

export async function getGuild(guildId: string, env: CloudflareEnv): Promise<Guild | null> {
  const key = `guild:${guildId}`;
  const cacheProviders = createCacheProviders(env);

  return withObjectCache(
    key,
    async () => {
      const freshGuild = await getGuildFromApi(guildId, env);

      if (!freshGuild) {
        return null;
      }

      // After fetching, create reverse index by name for searchability
      const { kvStore } = cacheProviders;
      const kvOptions = { expirationTtl: CACHE_TTL.user.kv };

      // Store reverse index: guild name -> guild data
      await kvStore.put(getGuildNameKey(freshGuild.name), JSON.stringify(freshGuild.id), kvOptions);

      return freshGuild;
    },
    cacheProviders,
    { ttl: CACHE_TTL.user.kv },
  );
}

export async function searchGuild(name: string, env: CloudflareEnv): Promise<Guild['id'] | null> {
  const kvKey = getGuildNameKey(name);

  const cacheProviders = createCacheProviders(env);

  return withKvCache(kvKey, async () => searchGuildFromApi(name, env), cacheProviders, {
    ttl: CACHE_TTL.user.kv,
  });
}
