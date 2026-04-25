import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';

export interface GuildUpgrade {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
}

function getGuildUpgradesFromApi(env: CloudflareEnv): Promise<GuildUpgrade[] | null> {
  return apiFetch(env, '/guild/upgrades?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
    return response.json<GuildUpgrade[]>();
  });
}

export async function getGuildUpgrades(ids: number[] | 'all', env: CloudflareEnv): Promise<GuildUpgrade[] | null> {
  if (ids !== 'all' && ids.length === 0) return [];
  const results = await withFilteredObjectCache(
    'guild-upgrades.json',
    ids,
    () => getGuildUpgradesFromApi(env),
    createCacheProviders(env),
  );
  return results.length > 0 ? results : null;
}
