import type { WvWMatchObjective } from '@repo/service-api/types';
import { isNil, isPresent } from '@repo/utils';

import { useClockStore } from '#lib/store/useClock';
import { cn } from '#lib/utils/cn';
import { useWvwObjective } from '#lib/wvw/objectives';
import { useWvwUpgradeTier } from '#lib/wvw/upgrades';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import type { Direction } from '#ui/wvw/config/objectivesLayoutConfig';
import { teamColorConfig, type TeamColorConfigKey } from '#ui/wvw/config/teamColorConfig';
import { ObjectiveDirection } from '#ui/wvw/matchup/maps/objective/Direction';
import { Guild } from '#ui/wvw/matchup/maps/objective/Guild';
import { Name } from '#ui/wvw/matchup/maps/objective/Name';
import { Timer } from '#ui/wvw/matchup/maps/objective/Timer';
import { UpgradeTier } from '#ui/wvw/matchup/maps/objective/UpgradeTier';

const RI_TIMER = 5 * 60;

export function MatchObjectiveRow({
  matchObjective,
  direction,
  onClick,
}: {
  matchObjective: WvWMatchObjective;
  direction: Direction;
  onClick: () => void;
}) {
  const ICON_SIZE = 24 as const;

  const { data: objectiveDef } = useWvwObjective(matchObjective.id);
  const upgradeTier = useWvwUpgradeTier(objectiveDef?.upgrade_id, matchObjective.yaks_delivered);

  const now = useClockStore((s) => {
    if (isNil(matchObjective.last_flipped) || s.nowMinute === null) return s.nowSecond;
    const holdSeconds = Math.floor(
      Temporal.Instant.from(matchObjective.last_flipped).until(s.nowMinute).total('seconds'),
    );
    return holdSeconds < RI_TIMER ? s.nowSecond : null;
  });

  const holdSeconds =
    isPresent(now) && isPresent(matchObjective.last_flipped)
      ? Math.floor(Temporal.Instant.from(matchObjective.last_flipped).until(now).total('seconds'))
      : null;
  const isInRI = holdSeconds !== null && holdSeconds < RI_TIMER;
  const ownerBg =
    matchObjective.owner === 'Neutral' ? null : teamColorConfig[matchObjective.owner as TeamColorConfigKey].bg;
  const ownerText =
    matchObjective.owner === 'Neutral' ? null : teamColorConfig[matchObjective.owner as TeamColorConfigKey].text;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={objectiveDef ? `Open details for ${objectiveDef.name}` : undefined}
      className={cn(
        'grid w-full items-center px-2 text-left transition-all duration-200',
        'cursor-pointer grid-cols-[52px_24px_12px_1fr_32px] gap-1',
        'hover:font-semibold',
        isInRI && ownerBg,
        ownerText,
      )}
    >
      <Guild claimedBy={matchObjective.claimed_by ?? undefined} />
      <span className="relative inline-flex">
        <ObjectiveIcon type={matchObjective.type} owner={matchObjective.owner} size={ICON_SIZE} />
        {isPresent(upgradeTier) && <UpgradeTier tier={upgradeTier} />}
      </span>
      <ObjectiveDirection direction={direction} width={ICON_SIZE / 2} height={ICON_SIZE / 2} />
      <Name objectiveId={matchObjective.id} />
      <Timer className={cn('min-w-8', isInRI && ownerBg)} lastFlipped={matchObjective.last_flipped ?? undefined} />
    </button>
  );
}
