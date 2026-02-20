import type { CloudflareEnv } from '@api/index';

export function createCacheProviders(env: CloudflareEnv) {
  return {
    objectStore: env.EMBLEM_ASSETS,
    kvStore: env.EMBLEM_ENGINE_GUILD_LOOKUP,
  };
}
