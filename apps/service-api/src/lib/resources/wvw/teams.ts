import { WVW_TEAMS, type WvwTeam } from '@service-api/definitions/wvw-teams';
import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { withFilteredObjectCache } from '@service-api/lib/resources/cache-wrapper';

function getWvwTeamFromApi(): Promise<WvwTeam[] | null> {
  return Promise.resolve(Object.values(WVW_TEAMS));
}

export async function getWvwTeam(id: string | string[], env: CloudflareEnv): Promise<WvwTeam[] | null> {
  return withFilteredObjectCache('wvw-teams', id, () => getWvwTeamFromApi(), createCacheProviders(env));
}
