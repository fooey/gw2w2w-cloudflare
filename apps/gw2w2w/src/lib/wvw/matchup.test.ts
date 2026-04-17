import { describe, expect, it } from 'vitest';
import { isMatchId, isTeamId, resolveSlug, resolveTeamId } from './matchup';

describe('isMatchId', () => {
  it('accepts valid match ids', () => {
    expect(isMatchId('1-1')).toBe(true);
    expect(isMatchId('2-3')).toBe(true);
  });
  it('rejects non-match strings', () => {
    expect(isMatchId('11001')).toBe(false);
    expect(isMatchId('na')).toBe(false);
    expect(isMatchId('')).toBe(false);
  });
});

describe('isTeamId', () => {
  it('accepts 5-digit numeric strings', () => {
    expect(isTeamId('11001')).toBe(true);
    expect(isTeamId('12001')).toBe(true);
  });
  it('rejects other strings', () => {
    expect(isTeamId('1-1')).toBe(false);
    expect(isTeamId('abc')).toBe(false);
    expect(isTeamId('1234')).toBe(false);
  });
});

describe('resolveTeamId', () => {
  it('returns a 5-digit team id as-is', () => {
    expect(resolveTeamId('11001')).toBe('11001');
  });
  it('returns null for unknown slugs', () => {
    expect(resolveTeamId('notaworld')).toBeNull();
  });
});

describe('resolveSlug', () => {
  it('detects a match id slug', () => {
    expect(resolveSlug('1-1')).toEqual({ matchId: '1-1', selectedTeamId: null });
    expect(resolveSlug('2-3')).toEqual({ matchId: '2-3', selectedTeamId: null });
  });
  it('resolves a raw team id slug', () => {
    expect(resolveSlug('11001')).toEqual({ matchId: null, selectedTeamId: '11001' });
  });
  it('returns nulls for completely unknown slug', () => {
    expect(resolveSlug('unknown-slug-xyz')).toEqual({ matchId: null, selectedTeamId: null });
  });
});
