import { MAP_TYPES, TEAM_COLORS } from '#ui/wvw/config/teamColorConfig';
import type { WvWObjective } from '@repo/service-api/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const OBJECTIVE_TYPES: WvWObjective['type'][] = ['Castle', 'Keep', 'Tower', 'Camp', 'Ruins'];
export const EVENT_TYPES = ['capture', 'claim'] as const;
export const OWNER_TYPES = ['Neutral', ...TEAM_COLORS] as const;
export const TIME_WINDOWS = ['1h', '4h', '8h', '24h', 'all'] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

export function getTimeCutoff(timeWindow: TimeWindow): Temporal.Instant | null {
  if (timeWindow === 'all') return null;
  const hours = parseInt(timeWindow, 10);
  return Temporal.Now.instant().subtract({ hours });
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// --- Event Log filters (includes eventTypes) ---

interface EventLogFiltersState {
  maps: string[];
  objectiveTypes: WvWObjective['type'][];
  eventTypes: (typeof EVENT_TYPES)[number][];
  owners: string[];
  timeWindow: TimeWindow;
  toggleMap: (value: string) => void;
  toggleObjectiveType: (value: WvWObjective['type']) => void;
  toggleEventType: (value: (typeof EVENT_TYPES)[number]) => void;
  toggleOwner: (value: string) => void;
  setTimeWindow: (value: TimeWindow) => void;
}

export const useEventLogFilters = create<EventLogFiltersState>()(
  persist(
    (set) => ({
      maps: [...MAP_TYPES],
      objectiveTypes: [...OBJECTIVE_TYPES],
      eventTypes: [...EVENT_TYPES],
      owners: [...OWNER_TYPES],
      timeWindow: 'all',
      toggleMap: (value) => {
        set((s) => ({ maps: toggle(s.maps, value) }));
      },
      toggleObjectiveType: (value) => {
        set((s) => ({ objectiveTypes: toggle(s.objectiveTypes, value) }));
      },
      toggleEventType: (value) => {
        set((s) => ({ eventTypes: toggle(s.eventTypes, value) }));
      },
      toggleOwner: (value) => {
        set((s) => ({ owners: toggle(s.owners, value) }));
      },
      setTimeWindow: (value) => {
        set({ timeWindow: value });
      },
    }),
    { name: 'gw2w2w.event-log-filters' },
  ),
);

// --- Activity Chart filters (same base filters + granularity) ---

export const GRANULARITIES = ['15m', '1h', '2h', '3h', '4h', '8h', '12h', '1d'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

interface ActivityChartFiltersState {
  maps: string[];
  objectiveTypes: WvWObjective['type'][];
  eventTypes: (typeof EVENT_TYPES)[number][];
  owners: string[];
  timeWindow: TimeWindow;
  granularity: Granularity;
  toggleMap: (value: string) => void;
  toggleObjectiveType: (value: WvWObjective['type']) => void;
  toggleEventType: (value: (typeof EVENT_TYPES)[number]) => void;
  toggleOwner: (value: string) => void;
  setTimeWindow: (value: TimeWindow) => void;
  setGranularity: (value: Granularity) => void;
}

export const useActivityChartFilters = create<ActivityChartFiltersState>()(
  persist(
    (set) => ({
      maps: [...MAP_TYPES],
      objectiveTypes: [...OBJECTIVE_TYPES],
      eventTypes: [...EVENT_TYPES],
      owners: [...OWNER_TYPES],
      timeWindow: '24h',
      granularity: '1h',
      toggleMap: (value) => {
        set((s) => ({ maps: toggle(s.maps, value) }));
      },
      toggleObjectiveType: (value) => {
        set((s) => ({ objectiveTypes: toggle(s.objectiveTypes, value) }));
      },
      toggleEventType: (value) => {
        set((s) => ({ eventTypes: toggle(s.eventTypes, value) }));
      },
      toggleOwner: (value) => {
        set((s) => ({ owners: toggle(s.owners, value) }));
      },
      setTimeWindow: (value) => {
        set({ timeWindow: value });
      },
      setGranularity: (value) => {
        set({ granularity: value });
      },
    }),
    { name: 'gw2w2w.activity-chart-filters' },
  ),
);

interface GuildActivityFiltersState {
  maps: string[];
  objectiveTypes: WvWObjective['type'][];
  owners: string[];
  timeWindow: TimeWindow;
  toggleMap: (value: string) => void;
  toggleObjectiveType: (value: WvWObjective['type']) => void;
  toggleOwner: (value: string) => void;
  setTimeWindow: (value: TimeWindow) => void;
}

export const useGuildActivityFilters = create<GuildActivityFiltersState>()(
  persist(
    (set) => ({
      maps: [...MAP_TYPES],
      objectiveTypes: [...OBJECTIVE_TYPES],
      owners: [...OWNER_TYPES],
      timeWindow: 'all',
      toggleMap: (value) => {
        set((s) => ({ maps: toggle(s.maps, value) }));
      },
      toggleObjectiveType: (value) => {
        set((s) => ({ objectiveTypes: toggle(s.objectiveTypes, value) }));
      },
      toggleOwner: (value) => {
        set((s) => ({ owners: toggle(s.owners, value) }));
      },
      setTimeWindow: (value) => {
        set({ timeWindow: value });
      },
    }),
    { name: 'gw2w2w.guild-activity-filters' },
  ),
);

// --- Team Activity filters (no owner filter — owners are the rows) ---

interface TeamActivityFiltersState {
  maps: string[];
  objectiveTypes: WvWObjective['type'][];
  timeWindow: TimeWindow;
  toggleMap: (value: string) => void;
  toggleObjectiveType: (value: WvWObjective['type']) => void;
  setTimeWindow: (value: TimeWindow) => void;
}

export const useTeamActivityFilters = create<TeamActivityFiltersState>()(
  persist(
    (set) => ({
      maps: [...MAP_TYPES],
      objectiveTypes: [...OBJECTIVE_TYPES],
      timeWindow: 'all',
      toggleMap: (value) => {
        set((s) => ({ maps: toggle(s.maps, value) }));
      },
      toggleObjectiveType: (value) => {
        set((s) => ({ objectiveTypes: toggle(s.objectiveTypes, value) }));
      },
      setTimeWindow: (value) => {
        set({ timeWindow: value });
      },
    }),
    { name: 'gw2w2w.team-activity-filters' },
  ),
);
