'use client';

import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import { useClock } from '@gw2w2w/lib/utils/useClock';
import { useWvwObjective } from '@gw2w2w/lib/wvw/objectives';
import { useGuild } from '@gw2w2w/lib/wvw/useGuild';
import { ObjectiveIcon } from '@gw2w2w/ui/wvw/common/ObjectiveIcon';
import { type Direction } from '@gw2w2w/ui/wvw/config/objectivesLayoutConfig';
import { teamColorConfig, type TeamColorConfigKey } from '@gw2w2w/ui/wvw/config/teamColorConfig';
import {
  ArrowDownIcon,
  ArrowDownLeftIcon,
  ArrowDownRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpLeftIcon,
  ArrowUpRightIcon,
  NoSymbolIcon,
  StarIcon,
} from '@heroicons/react/20/solid';
import { type WvWMatchObjective } from '@service-api/lib/resources/wvw/matches';
import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';

const FLIP_WINDOW_SECONDS = 5 * 60;
const RI_TIMER = 5 * 60; // seconds
const durationFormatter = new Intl.DurationFormat('en', { style: 'narrow' });

function getFlippedDisplay(isoString: string, now: Temporal.Instant | null): string | null {
  if (now === null) return null;
  const elapsed = Math.max(0, Math.floor(Temporal.Instant.from(isoString).until(now).total('seconds')));
  if (elapsed < FLIP_WINDOW_SECONDS) {
    const remaining = FLIP_WINDOW_SECONDS - elapsed;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins.toString()}:${secs.toString().padStart(2, '0')}`;
  }
  return null;
}

const DirectionIcons: Record<Direction, typeof StarIcon> = {
  C: StarIcon,
  N: ArrowUpIcon,
  NE: ArrowUpRightIcon,
  E: ArrowRightIcon,
  SE: ArrowDownRightIcon,
  S: ArrowDownIcon,
  SW: ArrowDownLeftIcon,
  W: ArrowLeftIcon,
  NW: ArrowUpLeftIcon,
};

function DirectionIcon({ direction, ...rest }: { direction: Direction } & React.ComponentProps<'svg'>) {
  const Icon = DirectionIcons[direction];
  return <Icon {...rest} />;
}

export function MatchObjectiveRow({
  matchObjective,
  direction,
}: {
  matchObjective: WvWMatchObjective;
  direction: Direction;
}) {
  const { data: objectiveLabels } = useWvwObjective(matchObjective.id);
  const now = useClock();
  const guildQuery = useGuild(matchObjective.claimed_by);
  const [emblemError, setEmblemError] = useState(false);

  const ICON_SIZE = 24 as const;

  const holdTime =
    now && matchObjective.last_flipped
      ? Math.floor(Temporal.Instant.from(matchObjective.last_flipped).until(now).total('seconds'))
      : null;

  const isInRI = holdTime !== null && holdTime < RI_TIMER;
  const freshCapture = holdTime !== null && holdTime <= 60;
  const ownerBg =
    matchObjective.owner !== 'Neutral' ? teamColorConfig[matchObjective.owner as TeamColorConfigKey].bg : null;
  const ownerText =
    matchObjective.owner !== 'Neutral' ? teamColorConfig[matchObjective.owner as TeamColorConfigKey].text : null;

  const timeDisplay =
    holdTime === null
      ? null
      : holdTime < RI_TIMER
        ? getFlippedDisplay(matchObjective.last_flipped, now)
        : durationFormatter.format(
            holdTime < 3600 ? { minutes: Math.floor(holdTime / 60) } : { hours: Math.floor(holdTime / 3600) },
          );

  return (
    <div
      className={clsx(
        'flex w-full flex-row items-center gap-8 px-2 transition-all duration-200',
        { 'font-semibold': isInRI },
        freshCapture && ownerBg,
        ownerText,
      )}
    >
      <span className="flex flex-row items-center gap-1">
        {matchObjective.claimed_by ? (
          <Link
            href={`/guilds/${matchObjective.claimed_by}`}
            className="flex shrink-0 items-center justify-center overflow-hidden"
          >
            {emblemError ? (
              <NoSymbolIcon className="size-6 text-zinc-400 opacity-25" />
            ) : (
              <>
                {/* <span className={clsx('w-8 text-xs')}>{guildQuery.data?.tag}</span> */}
                <img
                  src={getEmblemSrc(matchObjective.claimed_by)}
                  alt={guildQuery.data?.name ?? 'Guild Emblem'}
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  onError={() => {
                    setEmblemError(true);
                  }}
                />
              </>
            )}
          </Link>
        ) : (
          <span style={{ width: ICON_SIZE, height: ICON_SIZE, display: 'inline-block' }} className="shrink-0" />
        )}
        <ObjectiveIcon type={matchObjective.type} owner={matchObjective.owner} size={ICON_SIZE} className="shrink-0" />
        <DirectionIcon direction={direction} className="shrink-0" width={ICON_SIZE / 2} height={ICON_SIZE / 2} />
      </span>
      <div className="flex w-full flex-row items-center justify-between">
        <span className="max-w-32 overflow-hidden text-xs text-nowrap text-ellipsis">{objectiveLabels?.name}</span>
        <span>
          <span className={clsx('w-8 text-right font-mono text-xs', { 'opacity-30': !isInRI })}>{timeDisplay}</span>
        </span>
      </div>
    </div>
  );
}
