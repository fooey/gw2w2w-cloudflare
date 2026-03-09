const RESET_SCHEDULES = {
  eu: { day: 5, hour: 18 }, // Friday 18:00 UTC
  na: { day: 6, hour: 2 }, // Saturday 02:00 UTC
} as const;

export type WvWRegion = keyof typeof RESET_SCHEDULES;

export interface WvWMatchWindow {
  start: string;
  end: string;
}

export interface WvWTimers {
  region: WvWRegion;
  current: WvWMatchWindow;
  next: WvWMatchWindow;
}

export interface WvWLockoutTimer {
  region: WvWRegion;
  /** Lockout starts at the beginning of the current match */
  start: string;
  /** Lockout ends when the current match ends (at reset) */
  end: string;
}

export interface WvWTeamAssignmentTimer {
  region: WvWRegion;
  /** Team assignment is finalised at the weekly reset */
  assignAt: string;
}

function getNextResetDate(region: WvWRegion, now: Date): Date {
  const { day, hour } = RESET_SCHEDULES[region];
  const currentDay = now.getUTCDay();
  let daysUntil = (day - currentDay + 7) % 7;
  // If today is the reset day but we've already passed the reset hour, go to next week
  if (daysUntil === 0 && now.getUTCHours() >= hour) {
    daysUntil = 7;
  }
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil, hour, 0, 0, 0),
  );
}

function getPreviousResetDate(region: WvWRegion, now: Date): Date {
  const next = getNextResetDate(region, now);
  return new Date(next.getTime() - 7 * 24 * 60 * 60 * 1000);
}

export function getWvWTimers(region: WvWRegion, now: Date = new Date()): WvWTimers {
  const currentStart = getPreviousResetDate(region, now);
  const currentEnd = getNextResetDate(region, now);
  const nextEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    region,
    current: { start: currentStart.toISOString(), end: currentEnd.toISOString() },
    next: { start: currentEnd.toISOString(), end: nextEnd.toISOString() },
  };
}

export function getWvWLockoutTimer(region: WvWRegion, now: Date = new Date()): WvWLockoutTimer {
  const timers = getWvWTimers(region, now);
  return {
    region,
    start: timers.current.start,
    end: timers.current.end,
  };
}

export function getWvWTeamAssignmentTimer(region: WvWRegion, now: Date = new Date()): WvWTeamAssignmentTimer {
  const nextReset = getNextResetDate(region, now);
  return {
    region,
    assignAt: nextReset.toISOString(),
  };
}

export const WVW_REGIONS: WvWRegion[] = ['na', 'eu'];
