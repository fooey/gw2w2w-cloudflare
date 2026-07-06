'use client';

import { create } from 'zustand';

interface ClockState {
  nowSecond: Temporal.Instant | null;
  nowMinute: Temporal.Instant | null;
}

export const useClockStore = create<ClockState>()(() => ({ nowSecond: null, nowMinute: null }));

if (typeof window !== 'undefined') {
  setInterval(() => {
    const instant = Temporal.Now.instant();
    const minuteMark = instant.round({ smallestUnit: 'minute', roundingMode: 'trunc' });
    useClockStore.setState((s) => ({
      nowSecond: instant,
      nowMinute: s.nowMinute === null || !minuteMark.equals(s.nowMinute) ? minuteMark : s.nowMinute,
    }));
  }, 1000);
}

export function useClock(): Temporal.Instant | null {
  return useClockStore((s) => s.nowSecond);
}

export function useClockMinute(): Temporal.Instant | null {
  return useClockStore((s) => s.nowMinute);
}
