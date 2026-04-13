'use client';

import { apiBase } from '#lib/api/client';
import { type CaptureEvent, type ClaimEvent, useObjectiveLog } from '#lib/store/objectiveLog';
import { type WvWMatchStripped, type WvWObjective, type WvWTeamColor } from '@repo/service-api/types';
import { useEffect, useState } from 'react';

interface MatchStatePayload {
  matchId: string;
  data: WvWMatchStripped;
}

interface CapturePayload {
  id: number;
  matchId: string;
  objectiveId: string;
  objectiveType: WvWObjective['type'];
  mapType: string;
  owner: WvWTeamColor;
  at: string;
}

interface ClaimPayload {
  id: number;
  matchId: string;
  objectiveId: string;
  objectiveType: WvWObjective['type'];
  mapType: string;
  owner: WvWTeamColor;
  claimedBy: string;
  at: string;
}

interface ResetPayload {
  matchId: string;
  endTime: string;
}

/**
 * Opens an SSE connection to /wvw/stream?matchId= and returns live match state.
 * - match-state events update the returned match object
 * - capture/claim events are fed into the objective log store
 * - reset events clear the log for the match
 * The browser automatically reconnects on drop, sending Last-Event-ID so the
 * server can replay any missed events.
 */
export function useMatchSSE(matchId: string, initialMatch: WvWMatchStripped): WvWMatchStripped {
  const [match, setMatch] = useState(initialMatch);

  useEffect(() => {
    const es = new EventSource(`${apiBase}/wvw/stream?matchId=${matchId}`);
    const { _addEvents, clear } = useObjectiveLog.getState();

    const onMatchState = (e: MessageEvent) => {
      const payload = JSON.parse(e.data as string) as MatchStatePayload;
      setMatch(payload.data);
    };

    const onCapture = (e: MessageEvent) => {
      const p = JSON.parse(e.data as string) as CapturePayload;
      const event: CaptureEvent = {
        type: 'capture',
        at: Temporal.Instant.from(p.at),
        matchId: p.matchId,
        objectiveId: p.objectiveId,
        objectiveType: p.objectiveType,
        mapType: p.mapType,
        owner: p.owner,
      };
      _addEvents(p.matchId, [event]);
    };

    const onClaim = (e: MessageEvent) => {
      const p = JSON.parse(e.data as string) as ClaimPayload;
      const event: ClaimEvent = {
        type: 'claim',
        at: Temporal.Instant.from(p.at),
        matchId: p.matchId,
        objectiveId: p.objectiveId,
        objectiveType: p.objectiveType,
        mapType: p.mapType,
        owner: p.owner,
        claimedBy: p.claimedBy,
      };
      _addEvents(p.matchId, [event]);
    };

    const onReset = (e: MessageEvent) => {
      const p = JSON.parse(e.data as string) as ResetPayload;
      clear(p.matchId);
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

  return match;
}
