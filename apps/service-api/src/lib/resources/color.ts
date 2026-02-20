import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { apiFetch } from '@service-api/lib/resources/api';
import type { Color } from '@service-api/lib/types';
import { withFilteredObjectCache } from './cache-wrapper';

function getColorFromApi(env: CloudflareEnv): Promise<Color[] | null> {
  return apiFetch(env, '/colors?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Guild not found or no colors available
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  });
}

export async function getColor(id: number | number[] | 'all', env: CloudflareEnv): Promise<Color[]> {
  return withFilteredObjectCache('colors.json', id, () => getColorFromApi(env), createCacheProviders(env));
}
