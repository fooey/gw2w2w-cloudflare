import { MAP_TYPES, TEAM_COLORS } from '@gw2w2w/ui/wvw/config/teamColorConfig';
import { type WvWObjective } from '@service-api/lib/resources/wvw/objectives';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const OBJECTIVE_TYPES: WvWObjective['type'][] = ['Camp', 'Tower', 'Keep', 'Castle', 'Ruins'];
export const EVENT_TYPES = ['capture', 'claim'] as const;
export const OWNER_TYPES = ['Neutral', ...TEAM_COLORS] as const;

interface LogFiltersState {
  maps: string[];
  objectiveTypes: WvWObjective['type'][];
  eventTypes: (typeof EVENT_TYPES)[number][];
  owners: string[];
  toggleMap: (value: string) => void;
  toggleObjectiveType: (value: WvWObjective['type']) => void;
  toggleEventType: (value: (typeof EVENT_TYPES)[number]) => void;
  toggleOwner: (value: string) => void;
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export const useLogFilters = create<LogFiltersState>()(
  persist(
    (set) => ({
      maps: [...MAP_TYPES],
      objectiveTypes: [...OBJECTIVE_TYPES],
      eventTypes: [...EVENT_TYPES],
      owners: [...OWNER_TYPES],
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
    }),
    { name: 'gw2w2w.log-filters' },
  ),
);
