import type { CloudflareEnv } from '@service-api/index';

type CacheEnv = Pick<CloudflareEnv, 'EMBLEM_ASSETS' | 'EMBLEM_ENGINE_GUILD_LOOKUP'>;

export function createCacheProviders(env: CacheEnv): {
  objectStore: R2Bucket;
  kvStore: KVNamespace;
} {
  return {
    objectStore: env.EMBLEM_ASSETS,
    kvStore: env.EMBLEM_ENGINE_GUILD_LOOKUP,
  };
}
