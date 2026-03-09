import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { apiFetch } from '@service-api/lib/resources/api';
import { withFilteredObjectCache } from '@service-api/lib/resources/cache-wrapper';

export interface WvWRank {
  id: number;
  title: string;
  min_rank: number;
}

function getWvWRanksFromApi(env: CloudflareEnv): Promise<WvWRank[] | null> {
  return apiFetch(env, '/wvw/ranks?ids=all').then((response) => {
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
  return withFilteredObjectCache('wvw-ranks.json', id, () => getWvWRanksFromApi(env), createCacheProviders(env));
}
