import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';
import { z } from 'zod';

export type WvWTeamId = string;
export type WvWGuildApiResponse = Record<string, WvWTeamId>;

export const WvWGuildSchema = z
  .object({
    id: z.string(),
    teamId: z.string().describe('WvW world team ID this guild is registered with'),
    region: z.enum(['na', 'eu']).describe("WvW region: 'na' (North America) or 'eu' (Europe)"),
  })
  .describe('Guild entry in the WvW guild directory');

export type WvWGuild = z.infer<typeof WvWGuildSchema>;

function getWvWGuildFromApi(env: CloudflareEnv): Promise<WvWGuild[] | null> {
  return Promise.all([apiFetch(env, '/wvw/guilds/na'), apiFetch(env, '/wvw/guilds/eu')]).then(
    ([naResponse, euResponse]) => {
      if (!naResponse.ok || !euResponse.ok) {
        if (naResponse.status === 404 || euResponse.status === 404) {
          return null;
        } else {
          throw new Error(`API error retrieving WvW guilds`, {
            cause: {
              na: { status: naResponse.status, statusText: naResponse.statusText },
              eu: { status: euResponse.status, statusText: euResponse.statusText },
            },
          });
        }
      }

      const naDataPromise = naResponse.json<WvWGuildApiResponse>();
      const euDataPromise = euResponse.json<WvWGuildApiResponse>();

      return Promise.all([naDataPromise, euDataPromise]).then(
        ([naGuilds, euGuilds]: [WvWGuildApiResponse, WvWGuildApiResponse]) => {
          const allGuilds: WvWGuild[] = [];

          for (const [guildId, teamId] of Object.entries(naGuilds)) {
            allGuilds.push({ id: guildId, teamId, region: 'na' });
          }

          for (const [guildId, teamId] of Object.entries(euGuilds)) {
            allGuilds.push({ id: guildId, teamId, region: 'eu' });
          }

          return allGuilds;
        },
      );
    },
  );
}

export async function getWvwGuild(id: string | string[], env: CloudflareEnv): Promise<WvWGuild[] | null> {
  return withFilteredObjectCache('wvw-guilds', id, () => getWvWGuildFromApi(env), createCacheProviders(env), {
    ttl: CACHE_TTL.user.kv,
  });
}
