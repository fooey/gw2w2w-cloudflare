'use client';

import { OBJECTIVE_TYPES, useTeamActivityFilters } from '#lib/store/logFilters';
import { cn } from '#lib/utils/cn';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { MAP_TYPES, teamColorConfig } from '#ui/wvw/config/teamColorConfig';
import { getMapLabel } from '#ui/wvw/config/mapLabels';
import { FilterGroup, TimeWindowFilter } from '#ui/wvw/matchup/activity/Filters';
import { type EventRow } from '@repo/service-api/types';
import { useMemo } from 'react';

const ACTIVITY_OBJ_TYPES = ['Castle', 'Keep', 'Tower', 'Camp'] as const;
type ActivityObjType = (typeof ACTIVITY_OBJ_TYPES)[number];

const ACTIVITY_MAP_TYPES = ['Center', 'GreenHome', 'BlueHome', 'RedHome'] as const;
type ActivityMapType = (typeof ACTIVITY_MAP_TYPES)[number];

const TEAM_OWNERS = ['Green', 'Blue', 'Red'] as const;
type TeamOwner = (typeof TEAM_OWNERS)[number];

interface TeamRow {
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

const OBJ_TO_KEY: Record<ActivityObjType, keyof Omit<TeamRow, 'owner'>> = {
  Castle: 'claims_castle',
  Keep: 'claims_keep',
  Tower: 'claims_tower',
  Camp: 'claims_camp',
};

const MAP_TO_KEY: Record<ActivityMapType, keyof Omit<TeamRow, 'owner'>> = {
  Center: 'claims_center',
  GreenHome: 'claims_green_home',
  BlueHome: 'claims_blue_home',
  RedHome: 'claims_red_home',
};

function buildTeamRows(
  events: EventRow[],
  filters: { maps: string[]; objectiveTypes: string[]; timeWindow: string },
): { teams: TeamRow[]; overall: TeamRow } {
  const cutoffMs = filters.timeWindow === 'all' ? null : Date.now() - parseInt(filters.timeWindow, 10) * 3_600_000;

  const empty = (): Omit<TeamRow, 'owner'> => ({
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

  const byOwner = new Map<string, Omit<TeamRow, 'owner'>>(TEAM_OWNERS.map((o) => [o, empty()]));
  const overall = empty();

  for (const e of events) {
    if (e.type !== 'claim') continue;
    if (typeof e.at !== 'string') continue;
    if (cutoffMs != null && new Date(e.at).getTime() < cutoffMs) continue;
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

  const teams = TEAM_OWNERS.map((o) => ({ owner: o, ...(byOwner.get(o) ?? empty()) }));
  return { teams, overall: { owner: 'Green' as TeamOwner, ...overall } };
}

function TeamTableRow({
  row,
  label,
  className,
}: {
  row: Omit<TeamRow, 'owner'>;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn('border-t border-gray-100', className)}>
      <td className="px-2 py-1.5 text-sm font-semibold">{label}</td>
      {ACTIVITY_OBJ_TYPES.map((type) => (
        <td key={type} className="px-2 py-1.5 text-center text-sm text-gray-700 tabular-nums">
          {row[OBJ_TO_KEY[type]]}
        </td>
      ))}
      {ACTIVITY_MAP_TYPES.map((map) => (
        <td key={map} className="px-2 py-1.5 text-center text-sm text-gray-700 tabular-nums">
          {row[MAP_TO_KEY[map]]}
        </td>
      ))}
      <td className="px-2 py-1.5 text-center text-sm font-semibold text-gray-800 tabular-nums">{row.total}</td>
    </tr>
  );
}

interface TeamActivityProps {
  events: EventRow[];
}

export function TeamActivity({ events }: TeamActivityProps) {
  const { maps, objectiveTypes, timeWindow, toggleMap, toggleObjectiveType, setTimeWindow } = useTeamActivityFilters();

  const { teams, overall } = useMemo(
    () => buildTeamRows(events, { maps, objectiveTypes, timeWindow }),
    [events, maps, objectiveTypes, timeWindow],
  );

  return (
    <section className="mt-4 rounded p-2 shadow">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Team Activity</h2>
      <div className="mb-3 flex flex-col gap-1.5">
        <TimeWindowFilter value={timeWindow} onChange={setTimeWindow} />
        <FilterGroup label="Map" options={MAP_TYPES} active={maps} onToggle={toggleMap} getLabel={getMapLabel} />
        <FilterGroup label="Type" options={OBJECTIVE_TYPES} active={objectiveTypes} onToggle={toggleObjectiveType} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-20" />
            {ACTIVITY_OBJ_TYPES.map((t) => (
              <col key={t} className="w-12" />
            ))}
            {ACTIVITY_MAP_TYPES.map((m) => (
              <col key={m} className="w-14" />
            ))}
            <col className="w-14" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-1 text-xs font-semibold text-gray-500">Team</th>
              {ACTIVITY_OBJ_TYPES.map((type) => (
                <th key={type} className="px-2 py-1 text-center text-xs font-semibold text-gray-500" title={type}>
                  <ObjectiveIcon type={type} owner="Neutral" size={16} className="mx-auto shrink-0" />
                </th>
              ))}
              {ACTIVITY_MAP_TYPES.map((map) => (
                <th key={map} className="px-2 py-1 text-center text-xs font-semibold text-gray-500">
                  {getMapLabel(map)}
                </th>
              ))}
              <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((row) => {
              const colors = (teamColorConfig as Record<string, { text: string }>)[row.owner];
              return (
                <TeamTableRow
                  key={row.owner}
                  row={row}
                  label={row.owner}
                  className={cn('hover:bg-gray-50', colors?.text)}
                />
              );
            })}
            <TeamTableRow
              row={overall}
              label={<span className="text-gray-500">Overall</span>}
              className="border-t-2 border-gray-300 font-semibold"
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}
