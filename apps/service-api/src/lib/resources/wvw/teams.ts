import { WVW_TEAMS, type WvWTeam } from '@service-api/definitions/wvw-teams';
import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { withFilteredObjectCache } from '@service-api/lib/resources/cache-wrapper';

function getWvwTeamFromApi(): Promise<WvWTeam[] | null> {
  return Promise.resolve(Object.values(WVW_TEAMS));
}

export async function getWvwTeam(id: string | string[], env: CloudflareEnv): Promise<WvWTeam[] | null> {
  return withFilteredObjectCache('wvw-teams', id, () => getWvwTeamFromApi(), createCacheProviders(env));
}
