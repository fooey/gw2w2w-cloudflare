'use client';

import { EVENT_TYPES, OBJECTIVE_TYPES, OWNER_TYPES, useEventLogFilters } from '#lib/store/logFilters';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';
import { getMapLabel } from '#ui/wvw/config/mapLabels';
import { FilterGroup, TimeWindowFilter } from '#ui/wvw/matchup/activity/Filters';
import { ObjectiveLogsRow } from '#ui/wvw/matchup/activity/ObjectiveLogsRow';
import { type EventRow } from '@repo/service-api/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

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

const ROW_HEIGHT_PX = 32;

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
  } = useEventLogFilters();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0) : 0;

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
        <p className="h-96 text-sm text-gray-400">No events match the current filters.</p>
      ) : (
        <div ref={scrollRef} className="h-96 overflow-y-auto">
          <table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-14" />
              <col className="w-8" />
              <col className="w-6" />
              <col />
              <col className="w-16" />
              <col className="w-10" />
              <col className="w-14" />
              <col className="w-24" />
            </colgroup>
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: paddingTop }} />
                </tr>
              )}
              {virtualItems.map((vItem) => {
                const row = rows[vItem.index];
                if (!row) return null;
                return <ObjectiveLogsRow key={row.id} event={row} />;
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: paddingBottom }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
