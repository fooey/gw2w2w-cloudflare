import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';
import { z } from 'zod';

export const WvWAbilityRankSchema = z
  .object({
    cost: z.number().describe('WvW ability points required to unlock this rank'),
    effect: z.string().describe('Description of the effect gained at this rank'),
  })
  .describe('Single rank tier within a WvW ability progression');

export const WvWAbilitySchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    icon: z.string().describe('CDN URL to the ability icon'),
    ranks: z.array(WvWAbilityRankSchema),
  })
  .describe('WvW ability from /v2/wvw/abilities');

export type WvWAbilityRank = z.infer<typeof WvWAbilityRankSchema>;
export type WvWAbility = z.infer<typeof WvWAbilitySchema>;

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
