'use client';

import { useEffect, useRef, useState } from 'react';

import type { EventRow, WvWMapType, WvWMatch, WvWTeamColor } from '@repo/service-api/types';

import { getClientApi } from '#lib/api/api.client.ts';
import { GW2W2W_API_BASE } from '#lib/api/constants.ts';
import { fetchWvwEvents } from '#lib/api/wvw/events';

// Narrow types matching what the DO actually inserts — subset of WvWObjective['type']
type WvWObjectiveType = EventRow['objective_type'];

interface MatchStatePayload {
  matchId: string;
  data: WvWMatch;
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

export function coerceEventAt(at: unknown, fallbackAt: string): string {
  return typeof at === 'string' ? at : fallbackAt;
}

export function mergeInitialHistory(prev: EventRow[], incoming: EventRow[], fallbackAt: string): EventRow[] {
  const prevIds = new Set(prev.map((e) => e.id));
  const history = incoming
    .filter((e) => !prevIds.has(e.id))
    .map((e) => Object.assign({}, e, { at: coerceEventAt(e.at, fallbackAt) }));

  // SSE events that arrived before history loaded stay at the front (they're newer)
  return [...prev, ...history];
}

export function captureToRow(p: CapturePayload): EventRow {
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

export function claimToRow(p: ClaimPayload): EventRow {
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
  match: WvWMatch;
  /** All known events: initial D1 history + live SSE events. Newest first. */
  events: EventRow[];
}

/**
 * Opens an SSE connection to /wvw/stream?matchId= and manages all event state:
 * - Seeds from server-provided initialEvents (no initial REST fetch needed)
 * - Prepends capture/claim events received over SSE (deduped by id)
 * - On reset: reloads the page so the server re-fetches fresh match + event data
 */
export function useMatchSSE(matchId: string, initialMatch: WvWMatch, initialEvents: EventRow[]): UseMatchSSEResult {
  const [match, setMatch] = useState(initialMatch);
  const [events, setEvents] = useState<EventRow[]>(() =>
    initialEvents.map((e) => ({ ...e, at: coerceEventAt(e.at, initialMatch.start_time) })),
  );
  // Tracks current match start_time for use as fallback when an event has a
  // null/invalid `at` (can happen at match start before objectives are flipped).
  // A ref avoids stale closure issues without adding match to the effect deps.
  const matchStartTimeRef = useRef(initialMatch.start_time);

  useEffect(() => {
    const es = new EventSource(`${GW2W2W_API_BASE}/wvw/stream?matchId=${matchId}`);

    const onMatchState = (e: MessageEvent) => {
      // eslint-disable-next-line typescript/no-unsafe-type-assertion -- trusted same-origin SSE payload from our own API, not user input.
      const payload = JSON.parse(e.data as string) as MatchStatePayload;
      matchStartTimeRef.current = payload.data.start_time;
      setMatch(payload.data);
    };

    const onCapture = (e: MessageEvent) => {
      // eslint-disable-next-line typescript/no-unsafe-type-assertion -- trusted same-origin SSE payload from our own API, not user input.
      const p = JSON.parse(e.data as string) as CapturePayload;
      const row = captureToRow({ ...p, at: coerceEventAt(p.at, matchStartTimeRef.current) });
      setEvents((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
    };

    const onClaim = (e: MessageEvent) => {
      // eslint-disable-next-line typescript/no-unsafe-type-assertion -- trusted same-origin SSE payload from our own API, not user input.
      const p = JSON.parse(e.data as string) as ClaimPayload;
      const row = claimToRow({ ...p, at: coerceEventAt(p.at, matchStartTimeRef.current) });
      setEvents((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
    };

    const onReset = () => {
      window.location.reload();
    };

    es.addEventListener('match-state', onMatchState);
    es.addEventListener('capture', onCapture);
    es.addEventListener('claim', onClaim);
    es.addEventListener('reset', onReset);

    return () => {
      es.removeEventListener('match-state', onMatchState);
      es.removeEventListener('capture', onCapture);
      es.removeEventListener('claim', onClaim);
      es.removeEventListener('reset', onReset);
      es.close();
    };
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialEvents() {
      const data = await fetchWvwEvents(getClientApi(), { matchId });
      if (cancelled || !data) return;
      setEvents((prev) => mergeInitialHistory(prev, data.events, matchStartTimeRef.current));
    }

    void loadInitialEvents();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return { match, events };
}
