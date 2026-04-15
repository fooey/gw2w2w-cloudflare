import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import { type EventLogResponse } from '@repo/service-api/types';

export interface FetchWvwEventsParams {
  matchId: string;
  /** maxAge in seconds — omit for the "all" time window */
  maxAge?: number;
}

export async function fetchWvwEvents(params: FetchWvwEventsParams): Promise<EventLogResponse | null> {
  const qs = new URLSearchParams();
  qs.set('matchId', params.matchId);
  if (params.maxAge != null) qs.set('maxAge', String(params.maxAge));

  return apiFetch(`/wvw/events?${qs.toString()}`).then(parseResponse<EventLogResponse>);
}
