import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { apiFetch } from '@service-api/lib/resources/api';
import { withFilteredObjectCache } from '@service-api/lib/resources/cache-wrapper';

export interface WvWUpgradeEffect {
  name: string;
  description: string;
  icon: string;
}

export interface WvWUpgradeTier {
  name: string;
  yaks_required: number;
  upgrades: WvWUpgradeEffect[];
}

export interface WvWUpgrade {
  id: number;
  name: string;
  tiers: WvWUpgradeTier[];
}

function getWvWUpgradesFromApi(env: CloudflareEnv): Promise<WvWUpgrade[] | null> {
  return apiFetch(env, '/wvw/upgrades?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
    return response.json();
  });
}

export async function getWvWUpgrade(id: number | number[] | 'all', env: CloudflareEnv): Promise<WvWUpgrade[]> {
  return withFilteredObjectCache('wvw-upgrades.json', id, () => getWvWUpgradesFromApi(env), createCacheProviders(env));
}
