import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';
import { z } from 'zod';

export const WvWUpgradeEffectSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    icon: z.string().describe('CDN URL to the upgrade effect icon'),
  })
  .describe('Individual buff or effect gained within an upgrade tier');

export const WvWUpgradeTierSchema = z
  .object({
    name: z.string(),
    yaks_required: z.number().describe('Number of dolyak deliveries needed to unlock this tier'),
    upgrades: z.array(WvWUpgradeEffectSchema),
  })
  .describe('A tier within a WvW objective upgrade track');

export const WvWUpgradeSchema = z
  .object({
    id: z.number(),
    tiers: z.array(WvWUpgradeTierSchema),
  })
  .describe('WvW objective upgrade track from /v2/wvw/upgrades');

export type WvWUpgradeEffect = z.infer<typeof WvWUpgradeEffectSchema>;
export type WvWUpgradeTier = z.infer<typeof WvWUpgradeTierSchema>;
export type WvWUpgrade = z.infer<typeof WvWUpgradeSchema>;

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
