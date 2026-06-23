import { describe, expect, it, vi } from 'vitest';
import type { EventRow } from '@repo/service-api/types';
import { buildTeamRows, createEmptyTeamRow } from './teamActivityRows';

function makeClaim(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: 1,
    match_id: '1-1',
    type: 'claim',
    at: '2026-06-22T00:00:00.000Z',
    objective_id: '38-1',
    objective_type: 'Tower',
    owner: 'Green',
    map_type: 'Center',
    claimed_by: 'GUILD',
    ...overrides,
  };
}

describe('createEmptyTeamRow', () => {
  it('returns a fully zeroed row', () => {
    expect(createEmptyTeamRow()).toEqual({
      claims_castle: 0,
      claims_keep: 0,
      claims_tower: 0,
      claims_camp: 0,
      claims_center: 0,
      claims_green_home: 0,
      claims_blue_home: 0,
      claims_red_home: 0,
      total: 0,
    });
  });
});

describe('buildTeamRows', () => {
  it('aggregates claim counts by team, objective type, map, and total', () => {
    const events: EventRow[] = [
      makeClaim({ id: 1, owner: 'Green', objective_type: 'Tower', map_type: 'Center' }),
      makeClaim({ id: 2, owner: 'Blue', objective_type: 'Keep', map_type: 'BlueHome' }),
      makeClaim({ id: 3, owner: 'Red', objective_type: 'Camp', map_type: 'RedHome' }),
      makeClaim({ id: 4, owner: 'Green', objective_type: 'Castle', map_type: 'GreenHome' }),
    ];

    const { teams, overall } = buildTeamRows(events, {
      maps: ['Center', 'GreenHome', 'BlueHome', 'RedHome'],
      objectiveTypes: ['Castle', 'Keep', 'Tower', 'Camp', 'Ruins'],
      timeWindow: 'all',
    });

    expect(teams.find((r) => r.owner === 'Green')).toMatchObject({
      claims_tower: 1,
      claims_castle: 1,
      claims_center: 1,
      claims_green_home: 1,
      total: 2,
    });
    expect(teams.find((r) => r.owner === 'Blue')).toMatchObject({
      claims_keep: 1,
      claims_blue_home: 1,
      total: 1,
    });
    expect(teams.find((r) => r.owner === 'Red')).toMatchObject({
      claims_camp: 1,
      claims_red_home: 1,
      total: 1,
    });

    expect(overall).toMatchObject({
      claims_castle: 1,
      claims_keep: 1,
      claims_tower: 1,
      claims_camp: 1,
      claims_center: 1,
      claims_green_home: 1,
      claims_blue_home: 1,
      claims_red_home: 1,
      total: 4,
    });
  });

  it('ignores non-claim events and claims from non-team owners', () => {
    const events: EventRow[] = [
      makeClaim({ id: 1, type: 'capture', owner: 'Green' }),
      makeClaim({ id: 2, owner: 'Neutral' }),
      makeClaim({ id: 3, owner: 'Blue' }),
    ];

    const { teams, overall } = buildTeamRows(events, {
      maps: ['Center', 'GreenHome', 'BlueHome', 'RedHome'],
      objectiveTypes: ['Castle', 'Keep', 'Tower', 'Camp', 'Ruins'],
      timeWindow: 'all',
    });

    expect(teams.find((r) => r.owner === 'Blue')?.total).toBe(1);
    expect(teams.find((r) => r.owner === 'Green')?.total).toBe(0);
    expect(teams.find((r) => r.owner === 'Red')?.total).toBe(0);
    expect(overall.total).toBe(1);
  });

  it('applies map and objective type filters', () => {
    const events: EventRow[] = [
      makeClaim({ id: 1, owner: 'Green', objective_type: 'Tower', map_type: 'Center' }),
      makeClaim({ id: 2, owner: 'Green', objective_type: 'Camp', map_type: 'Center' }),
      makeClaim({ id: 3, owner: 'Green', objective_type: 'Tower', map_type: 'BlueHome' }),
    ];

    const { teams, overall } = buildTeamRows(events, {
      maps: ['Center'],
      objectiveTypes: ['Tower'],
      timeWindow: 'all',
    });

    expect(teams.find((r) => r.owner === 'Green')).toMatchObject({
      claims_tower: 1,
      claims_camp: 0,
      claims_center: 1,
      claims_blue_home: 0,
      total: 1,
    });
    expect(overall.total).toBe(1);
  });

  it('filters out events older than timeWindow hours', () => {
    const fixedNow = new Date('2026-06-22T12:00:00.000Z').getTime();
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const events: EventRow[] = [
      makeClaim({ id: 1, at: '2026-06-22T11:30:00.000Z', owner: 'Green' }),
      makeClaim({ id: 2, at: '2026-06-22T08:00:00.000Z', owner: 'Green' }),
    ];

    const { teams, overall } = buildTeamRows(events, {
      maps: ['Center', 'GreenHome', 'BlueHome', 'RedHome'],
      objectiveTypes: ['Castle', 'Keep', 'Tower', 'Camp', 'Ruins'],
      timeWindow: '2',
    });

    expect(teams.find((r) => r.owner === 'Green')?.total).toBe(1);
    expect(overall.total).toBe(1);

    dateNowSpy.mockRestore();
  });
});
