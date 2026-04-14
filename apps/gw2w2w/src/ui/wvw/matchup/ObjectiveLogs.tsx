'use client';

import { EVENT_TYPES, OBJECTIVE_TYPES, OWNER_TYPES, useLogFilters } from '#lib/store/logFilters';
import { cn } from '#lib/utils/cn';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';
import { FilterGroup, TimeWindowFilter } from '#ui/wvw/matchup/LogFilterGroup';
import { getMapLabel, ObjectiveLogsRow } from '#ui/wvw/matchup/ObjectiveLogsRow';
import { type EventRow } from '@repo/service-api/types';
import { useRef, useState } from 'react';

const TIME_WINDOW_TO_MAX_AGE: Record<string, number | undefined> = {
  '1h': 3_600,
  '4h': 4 * 3_600,
  '8h': 8 * 3_600,
  '24h': 24 * 3_600,
  'all': undefined,
};

interface ObjectiveLogsProps {
  /** All known events from useMatchSSE: initial history + live SSE prepends. */
  events: EventRow[];
}

export function ObjectiveLogs({ events }: ObjectiveLogsProps) {
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

  const maxAge = TIME_WINDOW_TO_MAX_AGE[timeWindow];

  // All filtering is client-side — events array comes pre-loaded from useMatchSSE.
  const cutoff = maxAge != null ? Temporal.Now.instant().subtract({ seconds: maxAge }) : null;

  function matchesFilters(e: EventRow): boolean {
    if (typeof e.at !== 'string') return false;
    if (cutoff != null && Temporal.Instant.compare(Temporal.Instant.from(e.at), cutoff) < 0) return false;
    if (maps.length < MAP_TYPES.length && !maps.includes(e.map_type)) return false;
    if (objectiveTypes.length < OBJECTIVE_TYPES.length && !objectiveTypes.includes(e.objective_type)) return false;
    if (eventTypes.length < EVENT_TYPES.length && !eventTypes.includes(e.type)) return false;
    if (owners.length < OWNER_TYPES.length && !owners.includes(e.owner)) return false;
    return true;
  }

  // Sort by actual event timestamp descending. ISO 8601 UTC strings are lexicographically comparable.
  // Use id as tiebreaker for events at the same second.
  const rows = events.filter(matchesFilters).sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id);

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
      {rows.length === 0 ? (
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
            {rows.map((event) => (
              <ObjectiveLogsRow key={event.id} event={event} />
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
