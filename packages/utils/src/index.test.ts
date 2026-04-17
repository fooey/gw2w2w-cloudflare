import { describe, expect, it } from 'vitest';
import { allowedCsrf, allowedOrigin, normalizeGuildName, validateArenaNetUuid, withJitter } from './index';

describe('normalizeGuildName', () => {
  it('lowercases and trims', () => {
    expect(normalizeGuildName('  Hello World  ')).toBe('hello world');
  });
  it('normalizes hyphens to spaces', () => {
    expect(normalizeGuildName('my-guild')).toBe('my guild');
  });
  it('strips diacritics', () => {
    expect(normalizeGuildName('Résumé')).toBe('resume');
  });
});

describe('validateArenaNetUuid', () => {
  it('accepts a valid GW2 guild id', () => {
    expect(validateArenaNetUuid('97C007DC-87D5-E311-9621-AC162DAE8ACD')).toBe(true);
  });
  it('rejects a non-uuid string', () => {
    expect(validateArenaNetUuid('not-a-uuid')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(validateArenaNetUuid('')).toBe(false);
  });
});

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

describe('allowedOrigin', () => {
  it('allows gw2w2w.com', () => {
    expect(allowedOrigin('https://gw2w2w.com', 'gw2w2w.com')).toBe('https://gw2w2w.com');
  });
  it('allows subdomains', () => {
    expect(allowedOrigin('https://emblem.gw2w2w.com', undefined)).toBe('https://emblem.gw2w2w.com');
  });
  it('allows localhost origins', () => {
    expect(allowedOrigin('http://localhost:3000', 'localhost:3000')).toBe('http://localhost:3000');
  });
  it('blocks unknown origins', () => {
    expect(allowedOrigin('https://evil.com', 'gw2w2w.com')).toBeUndefined();
  });
  it('returns undefined when origin is falsy', () => {
    expect(allowedOrigin(undefined, 'gw2w2w.com')).toBeUndefined();
  });
});

describe('allowedCsrf', () => {
  it('allows matching gw2w2w.com origin', () => {
    expect(allowedCsrf('https://gw2w2w.com', 'gw2w2w.com')).toBe(true);
  });
  it('allows subdomains', () => {
    expect(allowedCsrf('https://emblem.gw2w2w.com', 'emblem.gw2w2w.com')).toBe(true);
  });
  it('allows localhost dev setup', () => {
    expect(allowedCsrf('http://localhost:3000', 'localhost:8787')).toBe(true);
  });
  it('blocks mismatched origin and host', () => {
    expect(allowedCsrf('https://evil.com', 'gw2w2w.com')).toBe(false);
  });
  it('blocks when origin or host is missing', () => {
    expect(allowedCsrf(undefined, 'gw2w2w.com')).toBe(false);
    expect(allowedCsrf('https://gw2w2w.com', undefined)).toBe(false);
  });
});
