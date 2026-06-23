import type { ServiceApiClient } from '#lib/api/api.client.ts';
import type { EventLogResponse } from '@repo/service-api/types';
import { isPresent } from '@repo/utils';

export interface FetchWvwEventsParams {
  matchId: string;
  /** maxAge in seconds — omit for the "all" time window */
  maxAge?: number;
}

export async function fetchWvwEvents(
  api: ServiceApiClient,
  params: FetchWvwEventsParams,
): Promise<EventLogResponse | null> {
  const res = await api.wvw.events.$get({
    query: {
      matchId: params.matchId,
      ...(isPresent(params.maxAge) && { maxAge: String(params.maxAge) }),
    },
  });
  return res.json();
}
