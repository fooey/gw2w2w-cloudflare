import { describe, expect, it, vi } from 'vitest';
import type { EventRow } from '@repo/service-api/types';
import { buildGuildRows } from './guildActivityRows';

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
    claimed_by: 'GUILD_A',
    ...overrides,
  };
}

describe('buildGuildRows', () => {
  it('aggregates claim counts per guild by objective type, map, and total', () => {
    const events: EventRow[] = [
      makeClaim({ id: 1, claimed_by: 'GUILD_A', objective_type: 'Tower', map_type: 'Center' }),
      makeClaim({ id: 2, claimed_by: 'GUILD_A', objective_type: 'Castle', map_type: 'GreenHome' }),
      makeClaim({ id: 3, claimed_by: 'GUILD_B', objective_type: 'Keep', map_type: 'BlueHome' }),
    ];

    const rows = buildGuildRows(events, {
      maps: ['Center', 'GreenHome', 'BlueHome', 'RedHome'],
      objectiveTypes: ['Castle', 'Keep', 'Tower', 'Camp', 'Ruins'],
      owners: ['Neutral', 'Green', 'Blue', 'Red'],
      timeWindow: 'all',
    });

    expect(rows.find((r) => r.guild_id === 'GUILD_A')).toMatchObject({
      claims_tower: 1,
      claims_castle: 1,
      claims_center: 1,
      claims_green_home: 1,
      total: 2,
    });
    expect(rows.find((r) => r.guild_id === 'GUILD_B')).toMatchObject({
      claims_keep: 1,
      claims_blue_home: 1,
      total: 1,
    });
  });

  it('tracks the most recent event regardless of array order', () => {
    const events: EventRow[] = [
      makeClaim({ id: 1, at: '2026-06-22T00:00:00.000Z', owner: 'Green', map_type: 'Center' }),
      makeClaim({ id: 2, at: '2026-06-22T02:00:00.000Z', owner: 'Red', map_type: 'RedHome' }),
      makeClaim({ id: 3, at: '2026-06-22T01:00:00.000Z', owner: 'Blue', map_type: 'BlueHome' }),
    ];

    const [row] = buildGuildRows(events, {
      maps: ['Center', 'GreenHome', 'BlueHome', 'RedHome'],
      objectiveTypes: ['Castle', 'Keep', 'Tower', 'Camp', 'Ruins'],
      owners: ['Neutral', 'Green', 'Blue', 'Red'],
      timeWindow: 'all',
    });

    expect(row).toMatchObject({
      last_seen_at: '2026-06-22T02:00:00.000Z',
      last_activity_owner: 'Red',
      last_activity_map: 'RedHome',
      total: 3,
    });
  });

  it('ignores non-claim events and events with no claimed_by', () => {
    const events: EventRow[] = [
      makeClaim({ id: 1, type: 'capture', claimed_by: null }),
      makeClaim({ id: 2, claimed_by: null }),
      makeClaim({ id: 3, claimed_by: 'GUILD_A' }),
    ];

    const rows = buildGuildRows(events, {
      maps: ['Center', 'GreenHome', 'BlueHome', 'RedHome'],
      objectiveTypes: ['Castle', 'Keep', 'Tower', 'Camp', 'Ruins'],
      owners: ['Neutral', 'Green', 'Blue', 'Red'],
      timeWindow: 'all',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ guild_id: 'GUILD_A', total: 1 });
  });

  it('applies map, objective type, and owner filters', () => {
    const events: EventRow[] = [
      makeClaim({ id: 1, objective_type: 'Tower', map_type: 'Center', owner: 'Green' }),
      makeClaim({ id: 2, objective_type: 'Camp', map_type: 'Center', owner: 'Green' }),
      makeClaim({ id: 3, objective_type: 'Tower', map_type: 'BlueHome', owner: 'Green' }),
      makeClaim({ id: 4, objective_type: 'Tower', map_type: 'Center', owner: 'Red' }),
    ];

    const rows = buildGuildRows(events, {
      maps: ['Center'],
      objectiveTypes: ['Tower'],
      owners: ['Green'],
      timeWindow: 'all',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      claims_tower: 1,
      claims_camp: 0,
      claims_center: 1,
      claims_blue_home: 0,
      total: 1,
    });
  });

  it('filters out events older than timeWindow hours', () => {
    const fixedNow = new Date('2026-06-22T12:00:00.000Z').getTime();
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const events: EventRow[] = [
      makeClaim({ id: 1, at: '2026-06-22T11:30:00.000Z', claimed_by: 'GUILD_A' }),
      makeClaim({ id: 2, at: '2026-06-22T08:00:00.000Z', claimed_by: 'GUILD_A' }),
    ];

    const rows = buildGuildRows(events, {
      maps: ['Center', 'GreenHome', 'BlueHome', 'RedHome'],
      objectiveTypes: ['Castle', 'Keep', 'Tower', 'Camp', 'Ruins'],
      owners: ['Neutral', 'Green', 'Blue', 'Red'],
      timeWindow: '2',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.total).toBe(1);

    dateNowSpy.mockRestore();
  });
});
