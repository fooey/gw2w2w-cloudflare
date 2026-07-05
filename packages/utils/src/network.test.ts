import { describe, expect, it } from 'vitest';
import { withJitter } from './network';

describe('withJitter', () => {
  it('returns a number within ±10% of the TTL', () => {
    const ttl = 1000;
    for (let i = 0; i < 50; i++) {
      const result = withJitter(ttl);
      expect(result).toBeGreaterThanOrEqual(900);
      expect(result).toBeLessThanOrEqual(1100);
    }
  });
  it('supports a custom jitter factor', () => {
    const ttl = 1000;
    const result = withJitter(ttl, 0.5);
    expect(result).toBeGreaterThanOrEqual(500);
    expect(result).toBeLessThanOrEqual(1500);
  });
});
