import type { CloudflareEnv } from '@service-api/index';

export function createCacheProviders(env: CloudflareEnv): {
  objectStore: R2Bucket;
  kvStore: KVNamespace;
} {
  return {
    objectStore: env.EMBLEM_ASSETS,
    kvStore: env.EMBLEM_ENGINE_GUILD_LOOKUP,
  };
}
