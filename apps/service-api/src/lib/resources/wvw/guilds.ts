import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { apiFetch } from '@service-api/lib/resources/api';
import { withFilteredObjectCache } from '@service-api/lib/resources/cache-wrapper';

export type WvWTeamId = string;
export type WvWGuildApiResponse = Record<string, WvWTeamId>;
export interface WvWGuild {
  id: string;
  teamId: WvWTeamId;
  region: 'na' | 'eu';
}

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
  return withFilteredObjectCache('wvw-guilds', id, () => getWvWGuildFromApi(env), createCacheProviders(env));
}
