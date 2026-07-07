import type { CloudflareEnv } from '#index.ts';
import type { Color } from '#lib/types/index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';

import { withFilteredObjectCache } from './cache-wrapper';

async function getColorFromApi(env: CloudflareEnv): Promise<Color[] | null> {
  return apiFetch(env, '/colors?ids=all').then(async (response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Guild not found or no colors available
      }
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
    return response.json();
  });
}

export async function getColor(id: number | number[] | 'all', env: CloudflareEnv): Promise<Color[]> {
  return withFilteredObjectCache('colors.json', id, async () => getColorFromApi(env), createCacheProviders(env), {
    ttl: CACHE_TTL.patch.kv,
  });
}
