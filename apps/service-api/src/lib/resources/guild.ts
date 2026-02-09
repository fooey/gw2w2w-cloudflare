import { type CacheProviders } from '@/lib/resources';
import { getApi } from '@/lib/resources/api';
import type { GuildDTO } from 'guildwars2-ts';
import { z } from 'zod';
import { withKvCache, withObjectCache } from './cache-wrapper';
import { STORE_KV_TTL } from './constants';

export type Guild = z.infer<typeof GuildDTO>;

export function getGuildFromApi(guildId: string): Promise<Guild> {
  return getApi().guild.get(guildId);
}
export function searchGuildFromApi(name: string): Promise<Guild['id'] | undefined> {
  return getApi()
    .guild.find(name)
    .then((results) => {
      if (results.length === 1) {
        return results[0];
      }
      throw new Error(`No guilds found matching name: ${name}`);
    });
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

export async function getGuild(guildId: string, cacheProviders: CacheProviders): Promise<Guild | null> {
  const key = `guild:${guildId}`;

  return withObjectCache(
    key,
    async () => {
      const freshGuild = await getGuildFromApi(guildId);

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

export async function searchGuild(name: string, cacheProviders: CacheProviders): Promise<Guild | null> {
  const kvKey = getGuildNameKey(name);

  return withKvCache(
    kvKey,
    async () => {
      const guildId = await searchGuildFromApi(name);
      if (!guildId) {
        throw new Error(`No guild found with name: ${name}`);
      }
      return getGuild(guildId, cacheProviders);
    },
    cacheProviders,
  );
}
