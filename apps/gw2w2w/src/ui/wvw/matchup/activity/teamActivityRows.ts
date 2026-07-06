import type { EventRow } from '@repo/service-api/types';
import { isPresent } from '@repo/utils';

import { OBJECTIVE_TYPES } from '#lib/store/logFilters';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';

const TEAM_OWNERS = ['Green', 'Blue', 'Red'] as const;
type TeamOwner = (typeof TEAM_OWNERS)[number];

export interface TeamRow {
  owner: TeamOwner;
  claims_castle: number;
  claims_keep: number;
  claims_tower: number;
  claims_camp: number;
  claims_center: number;
  claims_green_home: number;
  claims_blue_home: number;
  claims_red_home: number;
  total: number;
}

export function createEmptyTeamRow(): Omit<TeamRow, 'owner'> {
  return {
    claims_castle: 0,
    claims_keep: 0,
    claims_tower: 0,
    claims_camp: 0,
    claims_center: 0,
    claims_green_home: 0,
    claims_blue_home: 0,
    claims_red_home: 0,
    total: 0,
  };
}

type ClaimField = keyof Omit<TeamRow, 'owner' | 'total'>;

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
  filters: { maps: string[]; objectiveTypes: string[]; timeWindow: string },
  cutoffMs: number | null,
): boolean {
  if (event.type !== 'claim') return false;
  if (typeof event.at !== 'string') return false;
  if (isPresent(cutoffMs) && new Date(event.at).getTime() < cutoffMs) return false;
  if (filters.maps.length < MAP_TYPES.length && !filters.maps.includes(event.map_type)) return false;
  if (filters.objectiveTypes.length < OBJECTIVE_TYPES.length && !filters.objectiveTypes.includes(event.objective_type))
    return false;
  return true;
}

export function buildTeamRows(
  events: EventRow[],
  filters: { maps: string[]; objectiveTypes: string[]; timeWindow: string },
): { teams: TeamRow[]; overall: TeamRow } {
  // parseInt tolerates trailing garbage and doesn't auto-detect a leading "0x" as hex, unlike Number().
  // eslint-disable-next-line unicorn/prefer-number-coercion
  const timeWindowHours = Number.parseInt(filters.timeWindow, 10);
  const cutoffMs = filters.timeWindow === 'all' ? null : Date.now() - timeWindowHours * 3_600_000;

  const byOwner = new Map<string, Omit<TeamRow, 'owner'>>(TEAM_OWNERS.map((o) => [o, createEmptyTeamRow()]));
  const overall = createEmptyTeamRow();

  for (const e of events) {
    if (!isClaimEventInScope(e, filters, cutoffMs)) continue;

    const row = byOwner.get(e.owner);
    if (!row) continue; // skip Neutral — teams only claim

    const objectiveField = OBJECTIVE_TYPE_FIELD[e.objective_type];
    if (objectiveField) {
      row[objectiveField]++;
      overall[objectiveField]++;
    }

    const mapField = MAP_TYPE_FIELD[e.map_type];
    if (mapField) {
      row[mapField]++;
      overall[mapField]++;
    }

    row.total++;
    overall.total++;
  }

  const teams = TEAM_OWNERS.map((o) => Object.assign({ owner: o }, byOwner.get(o) ?? createEmptyTeamRow()));
  return { teams, overall: { owner: 'Green', ...overall } };
}
