export const NOT_FOUND_CACHE_EXPIRATION = 60 * 60; // 1 hour

const seconds = (s: number) => s;
const minutes = (m: number) => m * 60;
const hours = (h: number) => h * 60 * 60;
const days = (d: number) => d * 60 * 60 * 24;

export const CACHE_TTL = {
  static: { kv: days(7), http: days(1) }, // patch-cycle data
  immutable: { kv: days(365), http: days(365) }, // textures, emblem assets
  user: { kv: hours(1), http: hours(1) }, // guilds
  live: { kv: seconds(10), http: minutes(5) }, // wvw objective timers
} as const;

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
