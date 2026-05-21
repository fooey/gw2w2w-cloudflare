import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';
import { z } from 'zod';

export const GuildUpgradeSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    icon: z.string().describe('CDN URL to the upgrade icon image'),
    type: z.string().describe("Upgrade category (e.g. 'BankBag', 'Unlock', 'Queue', 'Boost')"),
  })
  .describe('Guild upgrade definition from /v2/guild/upgrades');

export type GuildUpgrade = z.infer<typeof GuildUpgradeSchema>;

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
