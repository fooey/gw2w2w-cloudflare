import { type WvWObjective, type WvWTeamColor } from '@repo/service-api/types';
import { create } from 'zustand';

export interface CaptureEvent {
  type: 'capture';
  at: Temporal.Instant;
  matchId: string;
  objectiveId: string;
  objectiveType: WvWObjective['type'];
  mapType: string;
  owner: WvWTeamColor;
}

export interface ClaimEvent {
  type: 'claim';
  at: Temporal.Instant;
  matchId: string;
  objectiveId: string;
  objectiveType: WvWObjective['type'];
  mapType: string;
  owner: WvWTeamColor;
  claimedBy: string;
}

export type ObjectiveEvent = CaptureEvent | ClaimEvent;

export interface LogFilters {
  matchId?: string;
  mapType?: string | string[];
  objectiveType?: WvWObjective['type'] | WvWObjective['type'][];
  eventType?: ObjectiveEvent['type'] | ObjectiveEvent['type'][];
  since?: Temporal.Instant;
}

/** 4 hours — events older than this are purged unless they represent the current state of an objective */
export const DEFAULT_MAX_AGE_SECONDS = 4 * 60 * 60;

interface ObjectiveLogState {
  events: ObjectiveEvent[];
  maxAgeSeconds: number;
  setMaxAgeSeconds: (n: number) => void;
  /** @internal — use useObjectiveTracker to populate */
  _addEvents: (matchId: string, events: ObjectiveEvent[]) => void;
  clear: (matchId?: string) => void;
}

/**
 * Returns the set of "current state" events — the most recent event per
 * (matchId, objectiveId, type) triple. These are retained regardless of age.
 */
function currentStateSet(events: ObjectiveEvent[]): Set<ObjectiveEvent> {
  const latest = new Map<string, ObjectiveEvent>();
  for (const event of events) {
    const key = `${event.matchId}:${event.objectiveId}:${event.type}`;
    const existing = latest.get(key);
    if (!existing || Temporal.Instant.compare(event.at, existing.at) > 0) {
      latest.set(key, event);
    }
  }
  return new Set(latest.values());
}

function purge(events: ObjectiveEvent[], maxAgeSeconds: number): ObjectiveEvent[] {
  const cutoff = Temporal.Now.instant().subtract({ seconds: maxAgeSeconds });
  const current = currentStateSet(events);
  return events.filter((e) => current.has(e) || Temporal.Instant.compare(e.at, cutoff) >= 0);
}

export const useObjectiveLog = create<ObjectiveLogState>()((set) => ({
  events: [],
  maxAgeSeconds: DEFAULT_MAX_AGE_SECONDS,
  setMaxAgeSeconds: (maxAgeSeconds) => {
    set({ maxAgeSeconds });
  },
  _addEvents: (_matchId, incoming) => {
    set((state) => {
      const existingKeys = new Set(state.events.map((e) => `${e.matchId}:${e.objectiveId}:${e.type}:${e.at.toJSON()}`));
      const deduped = incoming.filter(
        (e) => !existingKeys.has(`${e.matchId}:${e.objectiveId}:${e.type}:${e.at.toJSON()}`),
      );
      return { events: purge([...deduped, ...state.events], state.maxAgeSeconds) };
    });
  },
  clear: (matchId) => {
    set((state) => ({
      events: matchId ? state.events.filter((e) => e.matchId !== matchId) : [],
    }));
  },
}));

const STORAGE_KEY = 'gw2w2w.objective-log';

// Serialized form: `at` is an ISO string (Temporal.Instant.toJSON() output)
type PersistedEvent = Omit<ObjectiveEvent, 'at'> & { at: string };
interface PersistedState {
  events: PersistedEvent[];
  maxAgeSeconds: number;
}

if (typeof window !== 'undefined') {
  // Rehydrate from localStorage, converting ISO strings back to Temporal.Instant
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      const events = parsed.events.map((e) => ({
        ...e,
        at: Temporal.Instant.from(e.at),
      })) as ObjectiveEvent[];
      useObjectiveLog.setState({
        events: purge(events, parsed.maxAgeSeconds),
        maxAgeSeconds: parsed.maxAgeSeconds,
      });
    }
  } catch {
    // Malformed storage — ignore
  }

  // Sync to localStorage on every state change
  // Temporal.Instant serializes to ISO string via its toJSON() method
  useObjectiveLog.subscribe((state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: state.events, maxAgeSeconds: state.maxAgeSeconds }));
    } catch {
      // Storage quota or other error — ignore
    }
  });
}

function matchesFilter(event: ObjectiveEvent, filters: LogFilters): boolean {
  if (filters.matchId && event.matchId !== filters.matchId) return false;
  if (filters.eventType) {
    const allowed = Array.isArray(filters.eventType) ? filters.eventType : [filters.eventType];
    if (!allowed.includes(event.type)) return false;
  }
  if (filters.since && Temporal.Instant.compare(event.at, filters.since) < 0) return false;
  if (filters.mapType) {
    const allowed = Array.isArray(filters.mapType) ? filters.mapType : [filters.mapType];
    if (!allowed.includes(event.mapType)) return false;
  }
  if (filters.objectiveType) {
    const allowed = Array.isArray(filters.objectiveType) ? filters.objectiveType : [filters.objectiveType];
    if (!allowed.includes(event.objectiveType)) return false;
  }
  return true;
}

export function useLogs(filters?: LogFilters): ObjectiveEvent[] {
  return useObjectiveLog((state) => (filters ? state.events.filter((e) => matchesFilter(e, filters)) : state.events));
}

export function useCaptureLogs(filters?: Omit<LogFilters, 'eventType'>): CaptureEvent[] {
  return useObjectiveLog((state) =>
    state.events.filter(
      (e): e is CaptureEvent =>
        e.type === 'capture' && (!filters || matchesFilter(e, { ...filters, eventType: 'capture' })),
    ),
  );
}

export function useClaimLogs(filters?: Omit<LogFilters, 'eventType'>): ClaimEvent[] {
  return useObjectiveLog((state) =>
    state.events.filter(
      (e): e is ClaimEvent => e.type === 'claim' && (!filters || matchesFilter(e, { ...filters, eventType: 'claim' })),
    ),
  );
}
