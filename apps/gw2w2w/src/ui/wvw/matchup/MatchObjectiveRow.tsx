'use client';

import { useClockStore } from '#lib/store/useClock';
import { cn } from '#lib/utils/cn';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { type Direction } from '#ui/wvw/config/objectivesLayoutConfig';
import { teamColorConfig, type TeamColorConfigKey } from '#ui/wvw/config/teamColorConfig';
import { ObjectiveDirection } from '#ui/wvw/matchup/objective/Direction';
import { ObjectiveGuild } from '#ui/wvw/matchup/objective/Guild';
import { ObjectiveName } from '#ui/wvw/matchup/objective/Name';
import { ObjectiveTimer } from '#ui/wvw/matchup/objective/Timer';
import { type WvWMatchObjective } from '@repo/service-api/types';

const RI_TIMER = 5 * 60;

export function MatchObjectiveRow({
  matchObjective,
  direction,
}: {
  matchObjective: WvWMatchObjective;
  direction: Direction;
}) {
  const ICON_SIZE = 24 as const;

  const now = useClockStore((s) => {
    if (!matchObjective.last_flipped || s.nowMinute === null) return s.nowSecond;
    const holdSeconds = Math.floor(
      Temporal.Instant.from(matchObjective.last_flipped).until(s.nowMinute).total('seconds'),
    );
    return holdSeconds < RI_TIMER ? s.nowSecond : null;
  });

  const holdSeconds =
    now && matchObjective.last_flipped
      ? Math.floor(Temporal.Instant.from(matchObjective.last_flipped).until(now).total('seconds'))
      : null;
  const isInRI = holdSeconds !== null && holdSeconds < RI_TIMER;
  const ownerBg =
    matchObjective.owner !== 'Neutral' ? teamColorConfig[matchObjective.owner as TeamColorConfigKey].bg : null;
  const ownerText =
    matchObjective.owner !== 'Neutral' ? teamColorConfig[matchObjective.owner as TeamColorConfigKey].text : null;

  return (
    <div
      className={cn(
        'grid w-full items-center px-2 transition-all duration-200',
        'grid-cols-[52px_24px_12px_1fr_32px] gap-1',
        'hover:font-semibold',
        isInRI && ownerBg,
        ownerText,
      )}
    >
      <ObjectiveGuild claimedBy={matchObjective.claimed_by ?? undefined} />
      <ObjectiveIcon type={matchObjective.type} owner={matchObjective.owner} size={ICON_SIZE} />
      <ObjectiveDirection direction={direction} width={ICON_SIZE / 2} height={ICON_SIZE / 2} />
      <ObjectiveName objectiveId={matchObjective.id} />
      <ObjectiveTimer className={cn('min-w-8', isInRI && ownerBg)} lastFlipped={matchObjective.last_flipped} />
    </div>
  );
}
