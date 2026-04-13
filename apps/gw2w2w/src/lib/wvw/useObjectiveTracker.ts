import { useObjectiveLog, type CaptureEvent, type ClaimEvent, type ObjectiveEvent } from '#lib/store/objectiveLog';
import { type WvWMatchStripped, type WvWObjective } from '@repo/service-api/types';
import { useEffect, useRef } from 'react';

interface ObjectiveSnapshot {
  mapType: string;
  objectiveType: WvWObjective['type'];
  owner: string;
  last_flipped: string | null | undefined;
  claimed_by?: string | null;
  claimed_at?: string | null;
}

export function useObjectiveTracker(match: WvWMatchStripped | null | undefined) {
  const matchId = match?.id;
  const prevRef = useRef(new Map<string, ObjectiveSnapshot>());

  // Reset the diff baseline when moving to a different match (but don't clear the log)
  useEffect(() => {
    prevRef.current = new Map();
  }, [matchId]);

  useEffect(() => {
    if (!match || !matchId) return;

    const newEvents: ObjectiveEvent[] = [];
    const next = new Map<string, ObjectiveSnapshot>();
    const isFirstRun = prevRef.current.size === 0;

    // Always seed on first run — deduplication in _addEvents handles events already in the log.
    // This ensures any state changes that occurred while offline are captured when the first
    // API response arrives, rather than being silently dropped.
    const shouldSeed = isFirstRun;

    for (const map of match.maps) {
      for (const obj of map.objectives) {
        const snap: ObjectiveSnapshot = {
          mapType: map.type,
          objectiveType: obj.type,
          owner: obj.owner,
          last_flipped: obj.last_flipped,
          claimed_by: obj.claimed_by,
          claimed_at: obj.claimed_at,
        };
        next.set(obj.id, snap);

        const prev = prevRef.current.get(obj.id);

        if (!prev) {
          if (shouldSeed) {
            if (obj.last_flipped) {
              newEvents.push({
                type: 'capture',
                at: Temporal.Instant.from(obj.last_flipped),
                matchId,
                objectiveId: obj.id,
                objectiveType: obj.type,
                mapType: map.type,
                owner: obj.owner,
              } satisfies CaptureEvent);
            }
            if (obj.claimed_by && obj.claimed_at) {
              newEvents.push({
                type: 'claim',
                at: Temporal.Instant.from(obj.claimed_at),
                matchId,
                objectiveId: obj.id,
                objectiveType: obj.type,
                mapType: map.type,
                owner: obj.owner,
                claimedBy: obj.claimed_by,
              } satisfies ClaimEvent);
            }
          }
        } else {
          if (obj.last_flipped && obj.last_flipped !== prev.last_flipped) {
            newEvents.push({
              type: 'capture',
              at: Temporal.Instant.from(obj.last_flipped),
              matchId,
              objectiveId: obj.id,
              objectiveType: obj.type,
              mapType: map.type,
              owner: obj.owner,
            } satisfies CaptureEvent);
          }
          if (obj.claimed_at && obj.claimed_at !== prev.claimed_at && obj.claimed_by) {
            newEvents.push({
              type: 'claim',
              at: Temporal.Instant.from(obj.claimed_at),
              matchId,
              objectiveId: obj.id,
              objectiveType: obj.type,
              mapType: map.type,
              owner: obj.owner,
              claimedBy: obj.claimed_by,
            } satisfies ClaimEvent);
          }
        }
      }
    }

    prevRef.current = next;

    if (newEvents.length > 0) {
      newEvents.sort((a, b) => Temporal.Instant.compare(b.at, a.at));
      useObjectiveLog.getState()._addEvents(matchId, newEvents);
    }
  }, [match, matchId]);
}
