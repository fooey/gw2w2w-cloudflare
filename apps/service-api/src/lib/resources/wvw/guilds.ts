import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { apiFetch } from '@service-api/lib/resources/api';
import { withFilteredObjectCache } from '@service-api/lib/resources/cache-wrapper';

export type WvwTeamId = string;
export type WvwGuildApiResponse = Record<string, WvwTeamId>;
export interface WvwGuild {
  id: string;
  teamId: WvwTeamId;
  region: 'na' | 'eu';
}

function getWvwGuildFromApi(env: CloudflareEnv): Promise<WvwGuild[] | null> {
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

      const naDataPromise = naResponse.json<WvwGuildApiResponse>();
      const euDataPromise = euResponse.json<WvwGuildApiResponse>();

      return Promise.all([naDataPromise, euDataPromise]).then(
        ([naGuilds, euGuilds]: [WvwGuildApiResponse, WvwGuildApiResponse]) => {
          const allGuilds: WvwGuild[] = [];

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

export async function getWvwGuild(id: string | string[], env: CloudflareEnv): Promise<WvwGuild[] | null> {
  return withFilteredObjectCache('wvw-guilds', id, () => getWvwGuildFromApi(env), createCacheProviders(env));
}
