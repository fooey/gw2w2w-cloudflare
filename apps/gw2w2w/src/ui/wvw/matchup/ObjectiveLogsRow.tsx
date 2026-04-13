import { useClockStore } from '#lib/store/useClock';
import { cn } from '#lib/utils/cn';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { getObjectiveDirection } from '#ui/wvw/config/objectivesLayoutConfig';
import { teamColorConfig, type TeamColorConfigKey } from '#ui/wvw/config/teamColorConfig';
import { ObjectiveDirection } from '#ui/wvw/matchup/objective/Direction';
import { ObjectiveGuild } from '#ui/wvw/matchup/objective/Guild';
import { ObjectiveName } from '#ui/wvw/matchup/objective/Name';
import { ObjectiveTimer } from '#ui/wvw/matchup/objective/Timer';
import { type EventRow } from '@repo/service-api/types';

const RI_TIMER = 5 * 60;

const MAP_LABELS: Record<string, string> = {
  Center: 'EBG',
  GreenHome: 'GBL',
  BlueHome: 'BBL',
  RedHome: 'RBL',
};

export function getMapLabel(mapType: string): string {
  return MAP_LABELS[mapType] ?? mapType;
}

interface ObjectiveLogsRowProps {
  event: EventRow;
}

export function ObjectiveLogsRow({ event }: ObjectiveLogsRowProps) {
  const now = useClockStore((s) => {
    if (event.type === 'claim') return s.nowMinute;
    if (s.nowMinute === null) return s.nowSecond;
    const holdSeconds = Math.floor(Temporal.Instant.from(event.at).until(s.nowMinute).total('seconds'));
    return holdSeconds < RI_TIMER ? s.nowSecond : null;
  });
  const direction = getObjectiveDirection(event.objective_id) ?? 'C';
  const claimedBy = event.type === 'claim' ? (event.claimed_by ?? undefined) : undefined;

  const holdSeconds = now ? Math.floor(Temporal.Instant.from(event.at).until(now).total('seconds')) : null;
  const freshCapture = holdSeconds !== null && holdSeconds <= 60;

  const teamConfig = teamColorConfig[event.owner as TeamColorConfigKey];

  return (
    <li
      className={cn(
        'animate-grow-in col-span-full grid grid-cols-subgrid items-center text-sm text-gray-500',
        'hover:font-semibold',
        freshCapture && teamConfig.bg,
        teamConfig.text,
      )}
    >
      <ObjectiveGuild claimedBy={claimedBy} />
      <ObjectiveIcon type={event.objective_type} owner={event.owner} size={24} />
      <ObjectiveDirection direction={direction} width={12} height={12} />
      <ObjectiveName objectiveId={event.objective_id} />
      <ObjectiveTimer lastFlipped={event.at} />
      <span className="min-w-8 text-center text-xs">{getMapLabel(event.map_type)}</span>
      <span className="min-w-12 text-xs">{event.type === 'capture' ? 'Capture' : 'Claim'}</span>
      <span className="min-w-24 text-right font-mono text-xs text-gray-400">
        {Temporal.Instant.from(event.at).toLocaleString(undefined, {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </li>
  );
}
