export const NOT_FOUND_CACHE_EXPIRATION = 60 * 60; // 1 hour

const seconds = (s: number) => s;
const minutes = (m: number) => m * 60;
const hours = (h: number) => h * 60 * 60;
const days = (d: number) => d * 60 * 60 * 24;

export const CACHE_TTL = {
  patch: { kv: days(30), http: days(1) }, // patch-cycle data, build-invalidated
  immutable: { kv: days(365), http: days(365) }, // textures, emblem assets
  user: { kv: days(1), http: hours(12) }, // guilds
  live: { kv: minutes(5), http: seconds(20) }, // wvw objective timers
} as const;

export const NOT_FOUND_CACHE_VALUE = '__NOT_FOUND__';
export function getEnableCacheLogging() {
  return true;
}
