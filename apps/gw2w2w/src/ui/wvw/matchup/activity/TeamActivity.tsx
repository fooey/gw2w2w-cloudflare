'use client';

import { useMemo } from 'react';

import type { EventRow } from '@repo/service-api/types';

import { OBJECTIVE_TYPES, useTeamActivityFilters } from '#lib/store/logFilters';
import { cn } from '#lib/utils/cn';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { getMapLabel } from '#ui/wvw/config/mapLabels';
import { MAP_TYPES, teamColorConfig } from '#ui/wvw/config/teamColorConfig';
import { FilterGroup, TimeWindowFilter } from '#ui/wvw/matchup/activity/Filters';
import { buildTeamRows, type TeamRow } from '#ui/wvw/matchup/activity/teamActivityRows';

const ACTIVITY_OBJ_TYPES = ['Castle', 'Keep', 'Tower', 'Camp'] as const;
type ActivityObjType = (typeof ACTIVITY_OBJ_TYPES)[number];

const ACTIVITY_MAP_TYPES = ['Center', 'GreenHome', 'BlueHome', 'RedHome'] as const;
type ActivityMapType = (typeof ACTIVITY_MAP_TYPES)[number];

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
