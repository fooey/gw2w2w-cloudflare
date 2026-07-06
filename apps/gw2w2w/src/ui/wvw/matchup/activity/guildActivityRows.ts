import type { EventRow, GuildActivityRow } from '@repo/service-api/types';
import { isEmpty, isPresent } from '@repo/utils';

import { OBJECTIVE_TYPES, OWNER_TYPES } from '#lib/store/logFilters';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';

type ClaimField = keyof Omit<
  GuildActivityRow,
  'guild_id' | 'match_id' | 'total' | 'last_seen_at' | 'last_activity_owner' | 'last_activity_map'
>;

// Ruins are not claimable, so they're deliberately absent here — an event with an
// objective_type/map_type not in these maps just skips that half of the increment.
const OBJECTIVE_TYPE_FIELD: Partial<Record<string, ClaimField>> = {
  Castle: 'claims_castle',
  Keep: 'claims_keep',
  Tower: 'claims_tower',
  Camp: 'claims_camp',
};

const MAP_TYPE_FIELD: Partial<Record<string, ClaimField>> = {
  Center: 'claims_center',
  GreenHome: 'claims_green_home',
  BlueHome: 'claims_blue_home',
  RedHome: 'claims_red_home',
};

function isClaimEventInScope(
  event: EventRow,
  filters: { maps: string[]; objectiveTypes: string[]; owners: string[]; timeWindow: string },
  cutoffMs: number | null,
): event is EventRow & { claimed_by: string } {
  if (event.type !== 'claim') return false;
  if (isEmpty(event.claimed_by)) return false;
  if (typeof event.at !== 'string') return false;
  if (isPresent(cutoffMs) && new Date(event.at).getTime() < cutoffMs) return false;
  if (filters.maps.length < MAP_TYPES.length && !filters.maps.includes(event.map_type)) return false;
  if (filters.objectiveTypes.length < OBJECTIVE_TYPES.length && !filters.objectiveTypes.includes(event.objective_type))
    return false;
  if (filters.owners.length < OWNER_TYPES.length && !filters.owners.includes(event.owner)) return false;
  return true;
}

export function buildGuildRows(
  events: EventRow[],
  filters: { maps: string[]; objectiveTypes: string[]; owners: string[]; timeWindow: string },
): GuildActivityRow[] {
  // parseInt tolerates trailing garbage and doesn't auto-detect a leading "0x" as hex, unlike Number().
  // eslint-disable-next-line unicorn/prefer-number-coercion
  const timeWindowHours = Number.parseInt(filters.timeWindow, 10);
  const cutoffMs = filters.timeWindow === 'all' ? null : Date.now() - timeWindowHours * 3_600_000;

  const map = new Map<string, GuildActivityRow>();

  for (const e of events) {
    if (!isClaimEventInScope(e, filters, cutoffMs)) continue;

    let row = map.get(e.claimed_by);
    if (!row) {
      row = {
        guild_id: e.claimed_by,
        match_id: e.match_id,
        claims_castle: 0,
        claims_keep: 0,
        claims_tower: 0,
        claims_camp: 0,
        claims_center: 0,
        claims_green_home: 0,
        claims_blue_home: 0,
        claims_red_home: 0,
        total: 0,
        last_seen_at: e.at,
        last_activity_owner: e.owner,
        last_activity_map: e.map_type,
      };
      map.set(e.claimed_by, row);
    }

    const objectiveField = OBJECTIVE_TYPE_FIELD[e.objective_type];
    if (objectiveField) row[objectiveField]++;

    const mapField = MAP_TYPE_FIELD[e.map_type];
    if (mapField) row[mapField]++;

    row.total++;

    if (e.at > row.last_seen_at) {
      row.last_seen_at = e.at;
      row.last_activity_owner = e.owner;
      row.last_activity_map = e.map_type;
    }
  }

  return Array.from(map.values());
}
