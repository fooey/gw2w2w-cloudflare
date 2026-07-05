import { WVW_TEAMS, type WvWTeam } from '#definitions/wvw-teams.ts';
import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';

// async for consistency with sibling *FromApi functions' apiCall contract, even though
// this one has no real fetch to await — WVW teams are static, defined locally.
// eslint-disable-next-line typescript/require-await
async function getWvwTeamFromApi(): Promise<WvWTeam[] | null> {
  return Object.values(WVW_TEAMS);
}

export async function getWvwTeam(id: string | string[], env: CloudflareEnv): Promise<WvWTeam[] | null> {
  return withFilteredObjectCache('wvw-teams', id, async () => getWvwTeamFromApi(), createCacheProviders(env));
}
