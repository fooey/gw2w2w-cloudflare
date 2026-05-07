import { GW2W2W_API_BASE } from '#lib/api/constants.ts';
import type { EventLogResponse } from '@repo/service-api/types';

export interface FetchWvwEventsParams {
  matchId: string;
  /** maxAge in seconds — omit for the "all" time window */
  maxAge?: number;
}

export async function fetchWvwEvents(params: FetchWvwEventsParams): Promise<EventLogResponse | null> {
  const qs = new URLSearchParams();
  qs.set('matchId', params.matchId);
  if (params.maxAge != null) qs.set('maxAge', String(params.maxAge));

  const res = await fetch(`${GW2W2W_API_BASE}/wvw/events?${qs.toString()}`);
  if (!res.ok) return null;
  return res.json();
}
