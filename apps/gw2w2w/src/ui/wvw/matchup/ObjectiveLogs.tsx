'use client';

import { EVENT_TYPES, getTimeCutoff, OBJECTIVE_TYPES, OWNER_TYPES, useLogFilters } from '#lib/store/logFilters';
import { useObjectiveLog } from '#lib/store/objectiveLog';
import { cn } from '#lib/utils/cn';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';
import { FilterGroup, TimeWindowFilter } from '#ui/wvw/matchup/LogFilterGroup';
import { getMapLabel, ObjectiveLogsRow } from '#ui/wvw/matchup/ObjectiveLogsRow';
import { useRef, useState } from 'react';

interface ObjectiveLogsProps {
  matchId: string;
}

export function ObjectiveLogs({ matchId }: ObjectiveLogsProps) {
  const allEvents = useObjectiveLog((state) => state.events);
  const {
    maps,
    objectiveTypes,
    eventTypes,
    owners,
    timeWindow,
    toggleMap,
    toggleObjectiveType,
    toggleEventType,
    toggleOwner,
    setTimeWindow,
  } = useLogFilters();
  const listRef = useRef<HTMLUListElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const cutoff = getTimeCutoff(timeWindow);

  const filtered = allEvents
    .filter(
      (e) =>
        e.matchId === matchId &&
        maps.includes(e.mapType) &&
        objectiveTypes.includes(e.objectiveType) &&
        eventTypes.includes(e.type) &&
        owners.includes(e.owner) &&
        (cutoff === null || Temporal.Instant.compare(e.at, cutoff) >= 0),
    )
    .sort((a, b) => Temporal.Instant.compare(b.at, a.at));

  // Update this when adding/removing columns from the event log row.
  // Left group: guild, icon, direction, name | Right group: timer, map, event type, timestamp
  const LOG_COLS = 'grid-cols-[auto_auto_auto_1fr_auto_auto_auto_auto]';

  return (
    <section className="mt-8 rounded p-2 shadow">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Event Log</h2>
      <div className="mb-3 flex flex-col gap-1.5">
        <TimeWindowFilter value={timeWindow} onChange={setTimeWindow} />
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
