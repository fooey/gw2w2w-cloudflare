'use client';

import { useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { EventRow } from '@repo/service-api/types';
import { isPresent } from '@repo/utils';

import type { Granularity, TimeWindow } from '#lib/store/logFilters';
import { EVENT_TYPES, OBJECTIVE_TYPES, OWNER_TYPES, useActivityChartFilters } from '#lib/store/logFilters';
import { getMapLabel } from '#ui/wvw/config/mapLabels';
import { MAP_TYPES } from '#ui/wvw/config/teamColorConfig';
import { FilterGroup, GranularityFilter, TimeWindowFilter } from '#ui/wvw/matchup/activity/Filters';

interface EventActivityChartProps {
  events: EventRow[];
}

// hex colors matching Tailwind green/blue/red/gray palettes
const OWNER_HEX: Record<string, string> = {
  Green: '#16a34a',
  Blue: '#2563eb',
  Red: '#dc2626',
  Neutral: '#9ca3af',
};

const GRANULARITY_SECONDS: Record<Granularity, number> = {
  '15m': 900,
  '1h': 3600,
  '2h': 7200,
  '3h': 10_800,
  '4h': 14_400,
  '8h': 28_800,
  '12h': 43_200,
  '1d': 86_400,
};

function bucketFloor(isoString: string, bucketSeconds: number): number {
  const epochSeconds = Math.floor(new Date(isoString).getTime() / 1000);
  return Math.floor(epochSeconds / bucketSeconds) * bucketSeconds;
}

function formatBucketLabel(epochSeconds: number, granularity: Granularity): string {
  const d = new Date(epochSeconds * 1000);
  if (granularity === '1d') {
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
  }
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

interface ChartBucket {
  label: string;
  epochSeconds: number;
  Green: number;
  Blue: number;
  Red: number;
  Neutral: number;
}

function buildChartData(
  events: EventRow[],
  filters: {
    maps: string[];
    objectiveTypes: string[];
    eventTypes: string[];
    owners: string[];
    timeWindow: TimeWindow;
    granularity: Granularity;
  },
): ChartBucket[] {
  const bucketSeconds = GRANULARITY_SECONDS[filters.granularity];
  const nowSeconds = Math.floor(Date.now() / 1000);
  // parseInt tolerates trailing garbage and doesn't auto-detect a leading "0x" as hex, unlike Number().
  // eslint-disable-next-line unicorn/prefer-number-coercion
  const timeWindowHours = Number.parseInt(filters.timeWindow, 10);
  const cutoffSeconds = filters.timeWindow === 'all' ? null : nowSeconds - timeWindowHours * 3600;

  const buckets = new Map<number, ChartBucket>();

  for (const e of events) {
    if (typeof e.at !== 'string') continue;
    if (isPresent(cutoffSeconds) && new Date(e.at).getTime() / 1000 < cutoffSeconds) continue;
    if (filters.maps.length < MAP_TYPES.length && !filters.maps.includes(e.map_type)) continue;
    if (filters.objectiveTypes.length < OBJECTIVE_TYPES.length && !filters.objectiveTypes.includes(e.objective_type))
      continue;
    if (filters.eventTypes.length < EVENT_TYPES.length && !filters.eventTypes.includes(e.type)) continue;
    if (filters.owners.length < OWNER_TYPES.length && !filters.owners.includes(e.owner)) continue;

    const key = bucketFloor(e.at, bucketSeconds);
    if (!buckets.has(key)) {
      buckets.set(key, {
        label: formatBucketLabel(key, filters.granularity),
        epochSeconds: key,
        Green: 0,
        Blue: 0,
        Red: 0,
        Neutral: 0,
      });
    }
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const owner = e.owner as keyof ChartBucket;
    if (owner in bucket && typeof bucket[owner] === 'number') {
      bucket[owner]++;
    }
  }

  return [...buckets.values()].toSorted((a, b) => a.epochSeconds - b.epochSeconds);
}

const ACTIVE_OWNERS = ['Green', 'Blue', 'Red', 'Neutral'] as const;

export function EventActivityChart({ events }: EventActivityChartProps) {
  const {
    maps,
    objectiveTypes,
    eventTypes,
    owners,
    timeWindow,
    granularity,
    toggleMap,
    toggleObjectiveType,
    toggleEventType,
    toggleOwner,
    setTimeWindow,
    setGranularity,
  } = useActivityChartFilters();

  const data = useMemo(
    () => buildChartData(events, { maps, objectiveTypes, eventTypes, owners, timeWindow, granularity }),
    [events, maps, objectiveTypes, eventTypes, owners, timeWindow, granularity],
  );

  return (
    <section className="mt-4 rounded p-2 shadow">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Event Activity</h2>
      <div className="mb-3 flex flex-col gap-1.5">
        <TimeWindowFilter value={timeWindow} onChange={setTimeWindow} />
        <GranularityFilter value={granularity} onChange={setGranularity} />
        <FilterGroup label="Map" options={MAP_TYPES} active={maps} onToggle={toggleMap} getLabel={getMapLabel} />
        <FilterGroup label="Type" options={OBJECTIVE_TYPES} active={objectiveTypes} onToggle={toggleObjectiveType} />
        <FilterGroup label="Event" options={EVENT_TYPES} active={eventTypes} onToggle={toggleEventType} />
        <FilterGroup label="Owner" options={OWNER_TYPES} active={owners} onToggle={toggleOwner} />
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">No events match the current filters.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {ACTIVE_OWNERS.filter((o) => owners.includes(o)).map((owner) => (
              <Line
                key={owner}
                type="monotone"
                dataKey={owner}
                stroke={OWNER_HEX[owner] ?? '#000000'}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
