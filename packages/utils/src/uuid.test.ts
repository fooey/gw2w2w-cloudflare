import { describe, expect, it } from 'vitest';

import { validateArenaNetUuid } from './uuid';

describe('validateArenaNetUuid', () => {
  it('accepts a uuid-shaped string', () => {
    expect(validateArenaNetUuid('97C007DC-87D5-E311-9621-AC162DAE8ACD')).toBe(true);
    expect(validateArenaNetUuid('a3d22f61-4b2e-4c10-b3f5-1a2b3c4d5e6f')).toBe(true);
    expect(validateArenaNetUuid('01430E6B-F617-F011-81B8-D206D0C515D3')).toBe(true);
  });
  it('rejects a string with the right shape but non-hex characters', () => {
    expect(validateArenaNetUuid('ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ')).toBe(false);
  });
  it('rejects a non-uuid string', () => {
    expect(validateArenaNetUuid('not-a-uuid')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(validateArenaNetUuid('')).toBe(false);
  });
});
