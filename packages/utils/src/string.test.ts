import { describe, expect, it } from 'vitest';

import { normalizeGuildName } from './string';

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
