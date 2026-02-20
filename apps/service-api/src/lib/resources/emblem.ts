import type { CloudflareEnv } from '@api/index';
import { createCacheProviders } from '@api/lib/cache-providers';
import { apiFetch } from '@api/lib/resources/api';
import type { Emblem } from '@api/lib/types';
import { withFilteredObjectCache } from './cache-wrapper';

function getEmblemBackgroundFromApi(env: CloudflareEnv): Promise<Emblem[] | null> {
  return apiFetch(env, '/emblem/backgrounds?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Guild not found
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  });
}

function getEmblemForegroundFromApi(env: CloudflareEnv): Promise<Emblem[] | null> {
  return apiFetch(env, '/emblem/foregrounds?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Guild not found
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  });
}

export async function getEmblemBackground(
  emblemId: number | number[] | 'all',
  env: CloudflareEnv,
): Promise<Emblem[] | null> {
  const cacheProviders = createCacheProviders(env);
  return withFilteredObjectCache(
    'backgrounds.json',
    emblemId,
    async () => {
      return getEmblemBackgroundFromApi(env);
    },
    cacheProviders,
  );
}

export async function getEmblemForeground(
  emblemId: number | number[] | 'all',
  env: CloudflareEnv,
): Promise<Emblem[] | null> {
  const cacheProviders = createCacheProviders(env);
  return withFilteredObjectCache(
    'foregrounds.json',
    emblemId,
    async () => {
      return getEmblemForegroundFromApi(env);
    },
    cacheProviders,
  );
}
