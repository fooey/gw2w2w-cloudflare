import { WVW_TEAMS, type WvWTeam } from '#definitions/wvw-teams.ts';
import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';

function getWvwTeamFromApi(): Promise<WvWTeam[] | null> {
  return Promise.resolve(Object.values(WVW_TEAMS));
}

export async function getWvwTeam(id: string | string[], env: CloudflareEnv): Promise<WvWTeam[] | null> {
  return withFilteredObjectCache('wvw-teams', id, () => getWvwTeamFromApi(), createCacheProviders(env));
}
