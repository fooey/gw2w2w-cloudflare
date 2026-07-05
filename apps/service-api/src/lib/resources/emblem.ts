import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import type { Emblem } from '#lib/types/index.ts';
import { withFilteredObjectCache } from './cache-wrapper';

function getEmblemBackgroundFromApi(env: CloudflareEnv): Promise<Emblem[] | null> {
  return apiFetch(env, '/emblem/backgrounds?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Guild not found
      }
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
    return response.json();
  });
}

function getEmblemForegroundFromApi(env: CloudflareEnv): Promise<Emblem[] | null> {
  return apiFetch(env, '/emblem/foregrounds?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Guild not found
      }
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
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
