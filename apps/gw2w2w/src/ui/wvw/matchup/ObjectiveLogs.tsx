'use client';

import { useObjectiveLog, type ObjectiveEvent } from '@gw2w2w/lib/store/objectiveLog';
import { getObjectiveDirection } from '@gw2w2w/ui/wvw/config/objectivesLayoutConfig';
import { MatchObjectiveRow } from '@gw2w2w/ui/wvw/matchup/MatchObjectiveRow';
import { type WvWMatchObjective } from '@service-api/lib/resources/wvw/matches';
import { useMemo } from 'react';

const MAP_LABELS: Record<string, string> = {
  Center: 'EBG',
  GreenHome: 'GBL',
  BlueHome: 'BBL',
  RedHome: 'RBL',
};

function getMapLabel(mapType: string): string {
  return MAP_LABELS[mapType] ?? mapType;
}

interface ObjectiveLogsProps {
  matchId: string;
}

function eventToMatchObjective(event: ObjectiveEvent): WvWMatchObjective {
  return {
    id: event.objectiveId,
    type: event.objectiveType,
    owner: event.owner,
    last_flipped: event.at.toJSON(),
    claimed_by: event.type === 'claim' ? event.claimedBy : undefined,
    claimed_at: event.type === 'claim' ? event.at.toJSON() : undefined,
    points_tick: 0,
    points_capture: 0,
    guild_upgrades: [],
  };
}

export function ObjectiveLogs({ matchId }: ObjectiveLogsProps) {
  const allEvents = useObjectiveLog((state) => state.events);
  const sorted = useMemo(
    () => allEvents.filter((e) => e.matchId === matchId).sort((a, b) => Temporal.Instant.compare(b.at, a.at)),
    [allEvents, matchId],
  );

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-400">No events yet.</p>;
  }

  return (
    <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
      {sorted.map((event) => {
        const matchObjective = eventToMatchObjective(event);
        const direction = getObjectiveDirection(event.objectiveId) ?? 'C';
        const key = `${event.objectiveId}-${event.at.toString()}-${event.type}`;

        return (
          <li key={key} className="animate-grow-in">
            <div className="flex flex-row items-center gap-2 text-sm text-gray-500">
              <MatchObjectiveRow matchObjective={matchObjective} direction={direction} />
              <span className="w-6 shrink-0 text-xs">{getMapLabel(event.mapType)}</span>
              <span className="w-12 shrink-0 text-xs">{event.type === 'capture' ? 'Capture' : 'Claim'}</span>
              <span className="w-32 shrink-0 text-xs text-gray-400">
                {event.at.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
