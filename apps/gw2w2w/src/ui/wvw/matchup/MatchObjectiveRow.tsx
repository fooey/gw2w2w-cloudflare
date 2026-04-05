'use client';

import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import { useClockStore } from '@gw2w2w/lib/store/useClock';
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

function ObjectiveTimeDisplay({ lastFlipped }: { lastFlipped: string | undefined }) {
  const now = useClockStore((s) => {
    if (!lastFlipped || s.nowMinute === null) return s.nowMinute;
    const holdSeconds = Math.floor(Temporal.Instant.from(lastFlipped).until(s.nowMinute).total('seconds'));
    return holdSeconds < RI_TIMER ? s.nowSecond : s.nowMinute;
  });

  if (!lastFlipped || now === null) return <span className="w-8" />;

  const holdTime = Math.floor(Temporal.Instant.from(lastFlipped).until(now).total('seconds'));
  const isInRI = holdTime < RI_TIMER;
  const timeDisplay = isInRI
    ? getFlippedDisplay(lastFlipped, now)
    : durationFormatter.format(
        holdTime < 3600 ? { minutes: Math.floor(holdTime / 60) } : { hours: Math.floor(holdTime / 3600) },
      );

  return <span className={clsx('w-8 text-right font-mono text-xs', { 'opacity-30': !isInRI })}>{timeDisplay}</span>;
}

export function MatchObjectiveRow({
  matchObjective,
  direction,
}: {
  matchObjective: WvWMatchObjective;
  direction: Direction;
}) {
  const { data: objectiveLabels } = useWvwObjective(matchObjective.id);
  const guildQuery = useGuild(matchObjective.claimed_by);
  const [emblemError, setEmblemError] = useState(false);

  const ICON_SIZE = 24 as const;

  // Compute at render time — refreshed on every API poll (~6s), no clock subscription needed.
  // Defaults to isInRI=true when last_flipped is absent.
  const holdSeconds = matchObjective.last_flipped
    ? Math.floor(Temporal.Instant.from(matchObjective.last_flipped).until(Temporal.Now.instant()).total('seconds'))
    : null;
  const isInRI = holdSeconds === null || holdSeconds < RI_TIMER;
  const freshCapture = holdSeconds !== null && holdSeconds <= 60;
  const ownerBg =
    matchObjective.owner !== 'Neutral' ? teamColorConfig[matchObjective.owner as TeamColorConfigKey].bg : null;
  const ownerText =
    matchObjective.owner !== 'Neutral' ? teamColorConfig[matchObjective.owner as TeamColorConfigKey].text : null;

  return (
    <div
      className={clsx(
        'flex w-full flex-row items-center justify-between gap-8 px-2 transition-all duration-200',
        { 'font-semibold': isInRI },
        freshCapture && ownerBg,
        ownerText,
      )}
    >
      <span className="flex flex-row items-center gap-1">
        {matchObjective.claimed_by ? (
          <Link
            href={`/guilds/${matchObjective.claimed_by}`}
            className="flex w-13 shrink-0 items-center justify-between"
          >
            <span className={clsx('w-6 text-[8px]')}>{guildQuery.data?.tag}</span>
            {emblemError ? (
              <>
                <NoSymbolIcon className="size-6 text-zinc-400 opacity-25" />
              </>
            ) : (
              <>
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
          <span className="w-13 shrink-0" />
        )}
        <ObjectiveIcon type={matchObjective.type} owner={matchObjective.owner} size={ICON_SIZE} className="shrink-0" />
        <DirectionIcon direction={direction} className="shrink-0" width={ICON_SIZE / 2} height={ICON_SIZE / 2} />
        <span className="max-w-32 overflow-hidden text-xs text-nowrap text-ellipsis">{objectiveLabels?.name}</span>
      </span>
      <div className="flex flex-row items-center justify-end">
        <ObjectiveTimeDisplay lastFlipped={matchObjective.last_flipped} />
      </div>
    </div>
  );
}
