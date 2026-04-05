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

  if (!lastFlipped || now === null) return <span />;

  const holdTime = Math.floor(Temporal.Instant.from(lastFlipped).until(now).total('seconds'));
  const isInRI = holdTime < RI_TIMER;
  const timeDisplay = isInRI
    ? getFlippedDisplay(lastFlipped, now)
    : durationFormatter.format(
        holdTime < 3600 ? { minutes: Math.floor(holdTime / 60) } : { hours: Math.floor(holdTime / 3600) },
      );

  return <span className={clsx('text-right font-mono text-xs', { 'opacity-30': !isInRI })}>{timeDisplay}</span>;
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

  // Subscribe to the clock only while within RI so the background/bold styling
  // clears accurately even when the API data hasn't changed (React Query structural sharing).
  // Outside RI the selector returns null — Zustand bails out and no re-render occurs on ticks.
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
  const isInRI = holdSeconds === null || holdSeconds < RI_TIMER;
  const freshCapture = holdSeconds !== null && holdSeconds <= 60;
  const ownerBg =
    matchObjective.owner !== 'Neutral' ? teamColorConfig[matchObjective.owner as TeamColorConfigKey].bg : null;
  const ownerText =
    matchObjective.owner !== 'Neutral' ? teamColorConfig[matchObjective.owner as TeamColorConfigKey].text : null;

  return (
    <div
      className={clsx(
        'grid w-full items-center px-2 transition-all duration-200',
        'grid-cols-[52px_24px_12px_1fr_32px] gap-1',
        { 'font-semibold': isInRI },
        freshCapture && ownerBg,
        ownerText,
      )}
    >
      {matchObjective.claimed_by ? (
        <Link
          href={`/guilds/${guildQuery.data?.name ? encodeURIComponent(guildQuery.data.name) : matchObjective.claimed_by}`}
          className="flex items-center justify-between"
          title={`${guildQuery.data?.name} (${guildQuery.data?.tag})`}
        >
          <span className="w-6 text-[8px]">{guildQuery.data?.tag}</span>
          {emblemError ? (
            <NoSymbolIcon className="size-6 text-zinc-400 opacity-25" />
          ) : (
            <img
              src={getEmblemSrc(matchObjective.claimed_by)}
              alt={guildQuery.data?.name ?? 'Guild Emblem'}
              width={ICON_SIZE}
              height={ICON_SIZE}
              onError={() => {
                setEmblemError(true);
              }}
            />
          )}
        </Link>
      ) : (
        <span />
      )}
      <ObjectiveIcon type={matchObjective.type} owner={matchObjective.owner} size={ICON_SIZE} />
      <DirectionIcon direction={direction} width={ICON_SIZE / 2} height={ICON_SIZE / 2} />
      <span className="overflow-hidden text-xs text-nowrap text-ellipsis">{objectiveLabels?.name}</span>
      <ObjectiveTimeDisplay lastFlipped={matchObjective.last_flipped} />
    </div>
  );
}
