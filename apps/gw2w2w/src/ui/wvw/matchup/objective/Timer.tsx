'use client';

import { useClockStore } from '@gw2w2w/lib/store/useClock';
import { cn } from '@gw2w2w/lib/utils/cn';

const FLIP_WINDOW_SECONDS = 5 * 60;
const RI_TIMER = 5 * 60;
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

export function ObjectiveTimer({ lastFlipped, className }: { lastFlipped: string | undefined; className?: string }) {
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

  return (
    <span className={cn('text-right font-mono text-xs', { 'opacity-30': !isInRI }, className)}>{timeDisplay}</span>
  );
}
