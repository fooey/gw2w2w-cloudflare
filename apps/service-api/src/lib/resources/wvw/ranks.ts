import { z } from 'zod';

import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';

export const WvWRankSchema = z
  .object({
    id: z.number(),
    title: z.string().describe('Rank title unlocked at this tier'),
    min_rank: z.number().describe('Minimum WvW rank score required to reach this title'),
  })
  .describe('WvW rank milestone from /v2/wvw/ranks');

export type WvWRank = z.infer<typeof WvWRankSchema>;

async function getWvWRanksFromApi(env: CloudflareEnv): Promise<WvWRank[] | null> {
  return apiFetch(env, '/wvw/ranks?ids=all').then(async (response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
    return response.json();
  });
}

export async function getWvWRank(id: number | number[] | 'all', env: CloudflareEnv): Promise<WvWRank[]> {
  return withFilteredObjectCache('wvw-ranks.json', id, async () => getWvWRanksFromApi(env), createCacheProviders(env));
}
