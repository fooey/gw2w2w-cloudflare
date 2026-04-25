import { useClockStore } from '#lib/store/useClock';
import { cn } from '#lib/utils/cn';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { getObjectiveDirection } from '#ui/wvw/config/objectivesLayoutConfig';
import { teamColorConfig } from '#ui/wvw/config/teamColorConfig';
import { getMapLabel } from '#ui/wvw/config/mapLabels';
import { ObjectiveDirection } from '#ui/wvw/matchup/maps/objective/Direction';
import { Guild } from '#ui/wvw/matchup/maps/objective/Guild';
import { Name } from '#ui/wvw/matchup/maps/objective/Name';
import { Timer } from '#ui/wvw/matchup/maps/objective/Timer';
import type { EventRow } from '@repo/service-api/types';

const RI_TIMER = 5 * 60;

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

  const teamConfig = teamColorConfig[event.owner];

  return (
    <tr className={cn('text-sm text-gray-500 hover:font-semibold', freshCapture && teamConfig.bg, teamConfig.text)}>
      <td className="px-1 py-0.5">
        <Guild claimedBy={claimedBy} linkable />
      </td>
      <td className="px-1 py-0.5">
        <ObjectiveIcon type={event.objective_type} owner={event.owner} size={24} />
      </td>
      <td className="w-4 px-1 py-0.5">
        <ObjectiveDirection direction={direction} width={12} height={12} />
      </td>
      <td className="px-1 py-0.5">
        <Name objectiveId={event.objective_id} />
      </td>
      <td className="w-16 px-1 py-0.5 text-right">
        <Timer lastFlipped={event.at} />
      </td>
      <td className="w-10 px-1 py-0.5 text-center text-xs">{getMapLabel(event.map_type)}</td>
      <td className="w-14 px-1 py-0.5 text-xs">{event.type === 'capture' ? 'Capture' : 'Claim'}</td>
      <td className="w-24 px-1 py-0.5 text-right font-mono text-xs text-gray-400">
        {Temporal.Instant.from(event.at).toLocaleString(undefined, {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </td>
    </tr>
  );
}
