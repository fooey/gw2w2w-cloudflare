// This file exercises the missing-origin/host code paths directly, so explicit `undefined`
// arguments are the point of the test, not redundant noise.
/* eslint-disable unicorn/no-useless-undefined */
import { describe, expect, it } from 'vitest';
import { allowedCsrf, allowedOrigin } from './security';

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
