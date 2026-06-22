import { OBJECTIVE_TYPES } from '#lib/store/logFilters';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';
import type { EventRow } from '@repo/service-api/types';

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

export function buildTeamRows(
  events: EventRow[],
  filters: { maps: string[]; objectiveTypes: string[]; timeWindow: string },
): { teams: TeamRow[]; overall: TeamRow } {
  const cutoffMs = filters.timeWindow === 'all' ? null : Date.now() - parseInt(filters.timeWindow, 10) * 3_600_000;

  const byOwner = new Map<string, Omit<TeamRow, 'owner'>>(TEAM_OWNERS.map((o) => [o, createEmptyTeamRow()]));
  const overall = createEmptyTeamRow();

  for (const e of events) {
    if (e.type !== 'claim') continue;
    if (typeof e.at !== 'string') continue;
    if (cutoffMs !== null && cutoffMs !== undefined && new Date(e.at).getTime() < cutoffMs) continue;
    if (filters.maps.length < MAP_TYPES.length && !filters.maps.includes(e.map_type)) continue;
    if (filters.objectiveTypes.length < OBJECTIVE_TYPES.length && !filters.objectiveTypes.includes(e.objective_type))
      continue;

    const row = byOwner.get(e.owner);
    if (!row) continue; // skip Neutral — teams only claim

    switch (e.objective_type) {
      case 'Castle':
        row.claims_castle++;
        overall.claims_castle++;
        break;
      case 'Keep':
        row.claims_keep++;
        overall.claims_keep++;
        break;
      case 'Tower':
        row.claims_tower++;
        overall.claims_tower++;
        break;
      case 'Camp':
        row.claims_camp++;
        overall.claims_camp++;
        break;
      case 'Ruins':
        // Ruins are not claimable
        break;
    }
    switch (e.map_type) {
      case 'Center':
        row.claims_center++;
        overall.claims_center++;
        break;
      case 'GreenHome':
        row.claims_green_home++;
        overall.claims_green_home++;
        break;
      case 'BlueHome':
        row.claims_blue_home++;
        overall.claims_blue_home++;
        break;
      case 'RedHome':
        row.claims_red_home++;
        overall.claims_red_home++;
        break;
    }
    row.total++;
    overall.total++;
  }

  const teams = TEAM_OWNERS.map((o) => ({ owner: o, ...(byOwner.get(o) ?? createEmptyTeamRow()) }));
  return { teams, overall: { owner: 'Green', ...overall } };
}