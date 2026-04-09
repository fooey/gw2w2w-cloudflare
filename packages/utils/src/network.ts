/**
 * Returns a TTL with ±10% random jitter to spread cache expiration times
 * and avoid thundering herd on mass-simultaneous cache misses.
 */
export function withJitter(ttl: number, factor = 0.1): number {
  const delta = ttl * factor;
  return Math.round(ttl + (Math.random() * 2 - 1) * delta);
}
