import { describe, expect, it } from 'vitest';

import type { WvWMatch } from './matches';
import { findMatchByWorld } from './matches';

function makeMatch(id: string, all_worlds: WvWMatch['all_worlds']): WvWMatch {
  // findMatchByWorld only reads id and all_worlds — the rest of WvWMatch is irrelevant here.
  return { id, all_worlds } as WvWMatch;
}

describe('findMatchByWorld', () => {
  // Post-restructuring team IDs (e.g. 11001 "Moogooloo") — the old 4-digit world IDs
  // (1001-2020 range) are deprecated since the WvW alliance restructuring.
  const matches = [
    makeMatch('1-1', { red: [11_001], blue: [11_002], green: [11_003, 11_013] }),
    makeMatch('1-2', { red: [11_004], blue: [11_005], green: [11_006] }),
  ];

  it('finds the match containing a given world id, regardless of team slot', () => {
    expect(findMatchByWorld(matches, 11_002)).toBe(matches[0]);
    expect(findMatchByWorld(matches, 11_005)).toBe(matches[1]);
  });

  it('finds a world in a guest-linked (non-primary) slot', () => {
    expect(findMatchByWorld(matches, 11_013)).toBe(matches[0]);
  });

  it('returns null when no match contains the world id', () => {
    expect(findMatchByWorld(matches, 99_999)).toBeNull();
  });

  it('returns null for an empty match list', () => {
    expect(findMatchByWorld([], 11_001)).toBeNull();
  });
});
