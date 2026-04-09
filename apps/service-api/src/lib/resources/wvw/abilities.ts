import { type CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';

export interface WvWAbilityRankEffect {
  description: string;
  icon: string;
}

export interface WvWAbilityRank {
  cost: number;
  effect: WvWAbilityRankEffect;
}

export interface WvWAbility {
  id: number;
  name: string;
  description: string;
  icon: string;
  ranks: WvWAbilityRank[];
}

function getWvWAbilitiesFromApi(env: CloudflareEnv): Promise<WvWAbility[] | null> {
  return apiFetch(env, '/wvw/abilities?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
    return response.json();
  });
}

export async function getWvWAbility(id: number | number[] | 'all', env: CloudflareEnv): Promise<WvWAbility[]> {
  return withFilteredObjectCache(
    'wvw-abilities.json',
    id,
    () => getWvWAbilitiesFromApi(env),
    createCacheProviders(env),
  );
}
