import { describe, expect, it } from 'vitest';
import type { EventRow } from '@repo/service-api/types';
import { captureToRow, claimToRow, coerceEventAt, mergeInitialHistory } from './useMatchSSE';

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: 1,
    match_id: '1-1',
    type: 'capture',
    at: '2026-06-22T00:00:00.000Z',
    objective_id: '38-1',
    objective_type: 'Tower',
    map_type: 'Center',
    owner: 'Green',
    claimed_by: null,
    ...overrides,
  };
}

describe('coerceEventAt', () => {
  it('returns input when it is a string', () => {
    expect(coerceEventAt('2026-06-22T00:00:00.000Z', 'fallback')).toBe('2026-06-22T00:00:00.000Z');
  });

  it('returns fallback for non-string values', () => {
    expect(coerceEventAt(null, 'fallback')).toBe('fallback');
    expect(coerceEventAt(undefined, 'fallback')).toBe('fallback');
  });
});

describe('mergeInitialHistory', () => {
  it('deduplicates by id and keeps live events at the front', () => {
    const live = [makeEvent({ id: 100, at: '2026-06-22T01:00:00.000Z' })];
    const history = [
      makeEvent({ id: 100, at: '2026-06-22T00:30:00.000Z' }),
      makeEvent({ id: 99, at: '2026-06-22T00:20:00.000Z' }),
    ];

    const merged = mergeInitialHistory(live, history, 'fallback');
    expect(merged.map((e) => e.id)).toStrictEqual([100, 99]);
  });

  it('coerces invalid history timestamps using fallback', () => {
    const live: EventRow[] = [];
    const history = [makeEvent({ id: 99, at: null as unknown as string })];

    const merged = mergeInitialHistory(live, history, '2026-06-22T05:00:00.000Z');
    expect(merged[0]?.at).toBe('2026-06-22T05:00:00.000Z');
  });
});

describe('captureToRow', () => {
  it('converts capture payload to EventRow shape', () => {
    const row = captureToRow({
      id: 7,
      matchId: '1-1',
      objectiveId: '38-1',
      objectiveType: 'Tower',
      mapType: 'Center',
      owner: 'Blue',
      at: '2026-06-22T00:00:00.000Z',
    });

    expect(row).toStrictEqual({
      id: 7,
      match_id: '1-1',
      type: 'capture',
      at: '2026-06-22T00:00:00.000Z',
      objective_id: '38-1',
      objective_type: 'Tower',
      map_type: 'Center',
      owner: 'Blue',
      claimed_by: null,
    });
  });
});

describe('claimToRow', () => {
  it('converts claim payload to EventRow shape', () => {
    const row = claimToRow({
      id: 8,
      matchId: '1-1',
      objectiveId: '38-1',
      objectiveType: 'Keep',
      mapType: 'RedHome',
      owner: 'Red',
      claimedBy: 'ABCD',
      at: '2026-06-22T00:00:00.000Z',
    });

    expect(row).toStrictEqual({
      id: 8,
      match_id: '1-1',
      type: 'claim',
      at: '2026-06-22T00:00:00.000Z',
      objective_id: '38-1',
      objective_type: 'Keep',
      map_type: 'RedHome',
      owner: 'Red',
      claimed_by: 'ABCD',
    });
  });
});
