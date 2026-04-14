'use client';

import { apiBase } from '#lib/api/client';
import { fetchWvwEvents } from '#lib/api/wvw/events';
import { type WvWMatchStripped, type WvWTeamColor, type WvWMapType } from '@repo/service-api/types';
import { type EventRow } from '@repo/service-api/types';
import { useEffect, useRef, useState } from 'react';

// Narrow types matching what the DO actually inserts — subset of WvWObjective['type']
type WvWObjectiveType = EventRow['objective_type'];

interface MatchStatePayload {
  matchId: string;
  data: WvWMatchStripped;
}

interface CapturePayload {
  id: number;
  matchId: string;
  objectiveId: string;
  objectiveType: WvWObjectiveType;
  mapType: WvWMapType;
  owner: WvWTeamColor;
  at: string;
}

interface ClaimPayload {
  id: number;
  matchId: string;
  objectiveId: string;
  objectiveType: WvWObjectiveType;
  mapType: WvWMapType;
  owner: WvWTeamColor;
  claimedBy: string;
  at: string;
}

interface ResetPayload {
  matchId: string;
  endTime: string;
}

function captureToRow(p: CapturePayload): EventRow {
  return {
    id: p.id,
    match_id: p.matchId,
    type: 'capture',
    at: p.at,
    objective_id: p.objectiveId,
    objective_type: p.objectiveType,
    map_type: p.mapType,
    owner: p.owner,
    claimed_by: null,
  };
}

function claimToRow(p: ClaimPayload): EventRow {
  return {
    id: p.id,
    match_id: p.matchId,
    type: 'claim',
    at: p.at,
    objective_id: p.objectiveId,
    objective_type: p.objectiveType,
    map_type: p.mapType,
    owner: p.owner,
    claimed_by: p.claimedBy,
  };
}

interface UseMatchSSEResult {
  match: WvWMatchStripped;
  /** All known events: initial D1 history + live SSE events. Newest first. */
  events: EventRow[];
  isLoadingEvents: boolean;
}

/**
 * Opens an SSE connection to /wvw/stream?matchId= and manages all event state:
 * - Fetches initial history from REST on mount
 * - Prepends capture/claim events received over SSE (deduped by id)
 * - On reset: clears events and re-fetches history
 */
export function useMatchSSE(matchId: string, initialMatch: WvWMatchStripped): UseMatchSSEResult {
  const [match, setMatch] = useState(initialMatch);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  // Tracks current match start_time for use as fallback when an event has a
  // null/invalid `at` (can happen at match start before objectives are flipped).
  // A ref avoids stale closure issues without adding match to the effect deps.
  const matchStartTimeRef = useRef(initialMatch.start_time);

  useEffect(() => {
    let cancelled = false;

    function coerceAt(at: unknown): string {
      return typeof at === 'string' ? at : matchStartTimeRef.current;
    }

    function seedHistory(id: string) {
      void fetchWvwEvents({ matchId: id }).then((data) => {
        if (!cancelled) {
          setEvents((data?.events ?? []).map((e) => (typeof e.at === 'string' ? e : { ...e, at: matchStartTimeRef.current })));
          setIsLoadingEvents(false);
        }
      });
    }

    seedHistory(matchId);

    const es = new EventSource(`${apiBase}/wvw/stream?matchId=${matchId}`);

    const onMatchState = (e: MessageEvent) => {
      const payload = JSON.parse(e.data as string) as MatchStatePayload;
      matchStartTimeRef.current = payload.data.start_time;
      setMatch(payload.data);
    };

    const onCapture = (e: MessageEvent) => {
      const p = JSON.parse(e.data as string) as CapturePayload;
      const row = captureToRow({ ...p, at: coerceAt(p.at) });
      setEvents((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
    };

    const onClaim = (e: MessageEvent) => {
      const p = JSON.parse(e.data as string) as ClaimPayload;
      const row = claimToRow({ ...p, at: coerceAt(p.at) });
      setEvents((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
    };

    const onReset = (e: MessageEvent) => {
      const p = JSON.parse(e.data as string) as ResetPayload;
      setEvents([]);
      setIsLoadingEvents(true);
      seedHistory(p.matchId);
    };

    es.addEventListener('match-state', onMatchState);
    es.addEventListener('capture', onCapture);
    es.addEventListener('claim', onClaim);
    es.addEventListener('reset', onReset);

    return () => {
      cancelled = true;
      es.removeEventListener('match-state', onMatchState);
      es.removeEventListener('capture', onCapture);
      es.removeEventListener('claim', onClaim);
      es.removeEventListener('reset', onReset);
      es.close();
    };
  }, [matchId]);

  return { match, events, isLoadingEvents };
}
