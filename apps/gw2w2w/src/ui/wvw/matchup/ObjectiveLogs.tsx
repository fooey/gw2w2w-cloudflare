'use client';

import { EVENT_TYPES, OBJECTIVE_TYPES, OWNER_TYPES, useLogFilters } from '@gw2w2w/lib/store/logFilters';
import { useObjectiveLog } from '@gw2w2w/lib/store/objectiveLog';
import { cn } from '@gw2w2w/lib/utils/cn';
import { MAP_TYPES } from '@gw2w2w/ui/wvw/config/teamColorConfig';
import { getMapLabel, ObjectiveLogsRow } from '@gw2w2w/ui/wvw/matchup/ObjectiveLogsRow';
import clsx from 'clsx';
import { useRef, useState } from 'react';

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

export function ObjectiveLogs({ matchId }: ObjectiveLogsProps) {
  const allEvents = useObjectiveLog((state) => state.events);
  const { maps, objectiveTypes, eventTypes, owners, toggleMap, toggleObjectiveType, toggleEventType, toggleOwner } =
    useLogFilters();
  const listRef = useRef<HTMLUListElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const filtered = allEvents
    .filter(
      (e) =>
        e.matchId === matchId &&
        maps.includes(e.mapType) &&
        objectiveTypes.includes(e.objectiveType) &&
        eventTypes.includes(e.type) &&
        owners.includes(e.owner),
    )
    .sort((a, b) => Temporal.Instant.compare(b.at, a.at));

  // Update this when adding/removing columns from the event log row.
  // Left group: guild, icon, direction, name | Right group: timer, map, event type, timestamp
  const LOG_COLS = 'grid-cols-[auto_auto_auto_1fr_auto_auto_auto_auto]';

  return (
    <section className="mt-8 rounded p-2 shadow">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Event Log</h2>
      <div className="mb-3 flex flex-col gap-1.5">
        <FilterGroup label="Map" options={MAP_TYPES} active={maps} onToggle={toggleMap} getLabel={getMapLabel} />
        <FilterGroup label="Type" options={OBJECTIVE_TYPES} active={objectiveTypes} onToggle={toggleObjectiveType} />
        <FilterGroup label="Event" options={EVENT_TYPES} active={eventTypes} onToggle={toggleEventType} />
        <FilterGroup label="Owner" options={OWNER_TYPES} active={owners} onToggle={toggleOwner} />
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">No events match the current filters.</p>
      ) : (
        <div className="relative">
          <ul
            ref={listRef}
            onScroll={(e) => {
              setShowScrollTop(e.currentTarget.scrollTop > 0);
            }}
            className={cn('grid max-h-96 gap-x-2 gap-y-1 overflow-y-auto', LOG_COLS)}
          >
            {filtered.map((event) => (
              <ObjectiveLogsRow key={`${event.objectiveId}-${event.at.toString()}-${event.type}`} event={event} />
            ))}
          </ul>
          {showScrollTop && (
            <button
              onClick={() => listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="absolute right-1 bottom-1 rounded bg-gray-700/80 px-2 py-0.5 text-xs text-white transition-opacity hover:bg-gray-600"
            >
              ↑ top
            </button>
          )}
        </div>
      )}
    </section>
  );
}
