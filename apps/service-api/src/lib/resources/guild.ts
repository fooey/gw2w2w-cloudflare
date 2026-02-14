import type { CloudflareEnv } from '@/index';
import { createCacheProviders } from '@/lib/cache-providers';
import { apiFetch } from '@/lib/resources/api';
import type { Guild } from '@/lib/types/Guild';
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

function validateArenaNetUuid(uuid: string): boolean {
  // Basic UUID format: 8-4-4-4-12 hex characters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function normalizeGuildName(name: string): string {
  return (
    name
      .toLowerCase() // ASCII-safe, fast
      .trim()
      .replaceAll('-', ' ') // Normalize spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      // Optional: Handle special characters consistently
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
      .substring(0, 100)
  ); // Prevent extremely long cache keys
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
      const jsonString = JSON.stringify(freshGuild);
      const kvOptions = { expirationTtl: STORE_KV_TTL };

      // Store reverse index: guild name -> guild data
      await kvStore.put(getGuildNameKey(freshGuild.name), jsonString, kvOptions);

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
