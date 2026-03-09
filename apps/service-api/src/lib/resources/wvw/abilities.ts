import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { apiFetch } from '@service-api/lib/resources/api';
import { withFilteredObjectCache } from '@service-api/lib/resources/cache-wrapper';

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
