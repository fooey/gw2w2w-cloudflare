'use client';

import { useObjectiveLog, type ObjectiveEvent } from '@gw2w2w/lib/store/objectiveLog';
import { EVENT_TYPES, OBJECTIVE_TYPES, OWNER_TYPES, useLogFilters } from '@gw2w2w/lib/store/logFilters';
import { getObjectiveDirection } from '@gw2w2w/ui/wvw/config/objectivesLayoutConfig';
import { MAP_TYPES } from '@gw2w2w/ui/wvw/config/teamColorConfig';
import { MatchObjectiveRow } from '@gw2w2w/ui/wvw/matchup/MatchObjectiveRow';
import { type WvWMatchObjective } from '@service-api/lib/resources/wvw/matches';
import { type WvWObjective } from '@service-api/lib/resources/wvw/objectives';
import clsx from 'clsx';
import { useMemo } from 'react';

const MAP_LABELS: Record<string, string> = {
  Center: 'EBG',
  GreenHome: 'GBL',
  BlueHome: 'BBL',
  RedHome: 'RBL',
};

const OBJECTIVE_TYPE_LABELS: Record<WvWObjective['type'], string> = {
  Castle: 'Castle',
  Keep: 'Keep',
  Camp: 'Camp',
  Tower: 'Tower',
  Ruins: 'Ruins',
  Spawn: 'Spawn',
  Mercenary: 'Merc',
  Generic: 'Generic',
};

function getMapLabel(mapType: string): string {
  return MAP_LABELS[mapType] ?? mapType;
}

function FilterGroup<T extends string>({
  label,
  options,
  active,
  onToggle,
  getLabel,
}: {
  label: string;
  options: readonly T[];
  active: string[];
  onToggle: (v: T) => void;
  getLabel?: (v: T) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-gray-400">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              onToggle(opt);
            }}
            className={clsx('rounded px-2 py-0.5 text-xs transition-colors', {
              'bg-gray-200 text-gray-400 line-through': !active.includes(opt),
              'bg-gray-700 text-white': active.includes(opt),
            })}
          >
            {getLabel ? getLabel(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ObjectiveLogsProps {
  matchId: string;
}

function eventToMatchObjective(event: ObjectiveEvent): WvWMatchObjective {
  return {
    id: event.objectiveId,
    type: event.objectiveType,
    owner: event.owner,
    last_flipped: event.at.toJSON(),
    claimed_by: event.type === 'claim' ? event.claimedBy : undefined,
    claimed_at: event.type === 'claim' ? event.at.toJSON() : undefined,
    points_tick: 0,
    points_capture: 0,
    guild_upgrades: [],
  };
}

export function ObjectiveLogs({ matchId }: ObjectiveLogsProps) {
  const allEvents = useObjectiveLog((state) => state.events);
  const { maps, objectiveTypes, eventTypes, owners, toggleMap, toggleObjectiveType, toggleEventType, toggleOwner } =
    useLogFilters();

  const filtered = useMemo(
    () =>
      allEvents
        .filter(
          (e) =>
            e.matchId === matchId &&
            maps.includes(e.mapType) &&
            objectiveTypes.includes(e.objectiveType) &&
            eventTypes.includes(e.type) &&
            owners.includes(e.owner),
        )
        .sort((a, b) => Temporal.Instant.compare(b.at, a.at)),
    [allEvents, matchId, maps, objectiveTypes, eventTypes, owners],
  );

  return (
    <section className="mt-8 rounded p-2 shadow">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Event Log</h2>
      <div className="mb-3 flex flex-col gap-1.5">
        <FilterGroup label="Map" options={MAP_TYPES} active={maps} onToggle={toggleMap} getLabel={getMapLabel} />
        <FilterGroup
          label="Type"
          options={OBJECTIVE_TYPES}
          active={objectiveTypes}
          onToggle={toggleObjectiveType}
          getLabel={(v) => OBJECTIVE_TYPE_LABELS[v]}
        />
        <FilterGroup label="Event" options={EVENT_TYPES} active={eventTypes} onToggle={toggleEventType} />
        <FilterGroup label="Owner" options={OWNER_TYPES} active={owners} onToggle={toggleOwner} />
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">No events match the current filters.</p>
      ) : (
        <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
          {filtered.map((event) => {
            const matchObjective = eventToMatchObjective(event);
            const direction = getObjectiveDirection(event.objectiveId) ?? 'C';
            const key = `${event.objectiveId}-${event.at.toString()}-${event.type}`;

            return (
              <li key={key} className="animate-grow-in">
                <div className="flex flex-row items-center gap-2 text-sm text-gray-500">
                  <MatchObjectiveRow matchObjective={matchObjective} direction={direction} />
                  <span className="w-6 shrink-0 text-xs">{getMapLabel(event.mapType)}</span>
                  <span className="w-12 shrink-0 text-xs">{event.type === 'capture' ? 'Capture' : 'Claim'}</span>
                  <span className="w-32 shrink-0 text-xs text-gray-400">
                    {event.at.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
