export const NOT_FOUND_CACHE_EXPIRATION = 60 * 60; // 1 hour
export const STORE_KV_TTL = 60 * 60 * 24; // 24 hours
export const STORE_OBJECT_TTL = 60 * 60 * 24; // 24 hours
export const STORE_STATIC_OBJECT_TTL = 60 * 60 * 24 * 365; // 1 year, objects that are not expected to change, like textures and colors

export const NOT_FOUND_CACHE_VALUE = '__NOT_FOUND__';
export function getEnableCacheLogging() {
  return true;
}

/**
 * Returns a TTL with ±10% random jitter to spread cache expiration times
 * and avoid thundering herd on mass-simultaneous cache misses.
 */
export function withJitter(ttl: number, factor = 0.1): number {
  const delta = ttl * factor;
  return Math.round(ttl + (Math.random() * 2 - 1) * delta);
}
