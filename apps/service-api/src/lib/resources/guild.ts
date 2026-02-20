import { normalizeGuildName, validateArenaNetUuid } from '@repo/utils';
import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { apiFetch } from '@service-api/lib/resources/api';
import type { Guild } from '@service-api/lib/types/Guild';
import { withKvCache, withObjectCache } from './cache-wrapper';
import { STORE_KV_TTL } from './constants';

export function getGuildFromApi(guildId: string, env: CloudflareEnv): Promise<Guild | null> {
  return apiFetch(env, `/guild/${guildId}`).then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Guild not found
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  });
}

export function searchGuildFromApi(name: string, env: CloudflareEnv): Promise<Guild['id'] | null> {
  return apiFetch(env, `/guild/search?name=${name}`)
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Guild not found
        } else {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
      }

      return response.json();
    })
    .then((result) => {
      if (Array.isArray(result)) {
        const guildId = result[0];

        if (typeof guildId !== 'string' || !validateArenaNetUuid(guildId)) {
          return null;
        }
        return guildId;
      }

      return null;
    });
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
      const kvOptions = { expirationTtl: STORE_KV_TTL };

      // Store reverse index: guild name -> guild data
      await kvStore.put(getGuildNameKey(freshGuild.name), freshGuild.id, kvOptions);

      return freshGuild;
    },
    cacheProviders,
  );
}

export async function searchGuild(name: string, env: CloudflareEnv): Promise<Guild['id'] | null> {
  const kvKey = getGuildNameKey(name);
  const cacheProviders = createCacheProviders(env);

  return withKvCache(kvKey, async () => searchGuildFromApi(name, env), cacheProviders);
}
