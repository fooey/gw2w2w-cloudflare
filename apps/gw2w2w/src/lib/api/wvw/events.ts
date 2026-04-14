import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import { type EventLogResponse, type EventRow } from '@repo/service-api/types';

export interface FetchWvwEventsParams {
  matchId: string;
  /** maxAge in seconds — omit for the "all" time window */
  maxAge?: number;
}

const PAGE_SIZE = 500;

export async function fetchWvwEvents(params: FetchWvwEventsParams): Promise<EventLogResponse | null> {
  const allEvents: EventRow[] = [];
  let offset = 0;

  for (;;) {
    const qs = new URLSearchParams();
    qs.set('matchId', params.matchId);
    if (params.maxAge != null) qs.set('maxAge', String(params.maxAge));
    qs.set('limit', String(PAGE_SIZE));
    qs.set('offset', String(offset));

    const page = await apiFetch(`/wvw/events?${qs.toString()}`).then(parseResponse<EventLogResponse>);
    if (!page) return null;

    allEvents.push(...page.events);

    if (allEvents.length >= page.total || page.events.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return { events: allEvents, total: allEvents.length, limit: PAGE_SIZE, offset: 0 };
}
