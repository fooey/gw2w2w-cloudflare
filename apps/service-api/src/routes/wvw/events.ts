import { getDb } from '#db/index.ts';
import { events } from '#db/schema.ts';
import type { CloudflareEnv } from '#index.ts';
import { isPresent } from '@repo/utils';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';

export type EventRow = typeof events.$inferSelect;

export interface EventLogResponse {
  events: EventRow[];
  total: number;
  limit: number;
  offset: number;
}

// Safety cap — sized to hold a full match week with room to spare.
const MAX_LIMIT = 10_000;

const querySchema = z.object({
  matchId: z.string().regex(/^\d-\d$/u),
  // maxAge in seconds — omit for the "all" time window
  maxAge: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(MAX_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export const apiWvwEventsRoute = new Hono<{ Bindings: CloudflareEnv }>().get(
  '/',
  describeRoute({
    summary: 'Query WvW events',
    description:
      'Returns paginated WvW objective events (captures, claims) for a match. Supports time-based filtering via maxAge.',
    tags: ['WvW Events'],
    responses: { 200: { description: 'Paginated event log response' } },
  }),
  validator('query', querySchema),
  async (c) => {
    const { matchId, maxAge, limit, offset } = c.req.valid('query');

    const conditions = [eq(events.match_id, matchId)];

    if (isPresent(maxAge)) {
      // GW2 stores timestamps as "YYYY-MM-DDTHH:mm:ssZ" (no milliseconds).
      // Truncate the cutoff to seconds so SQLite's lexicographic comparison is correct.
      const cutoff = new Date(Date.now() - maxAge * 1_000).toISOString().replace(/\.\d{3}Z$/u, 'Z');
      conditions.push(gte(events.at, cutoff));
    }

    const db = getDb(c.env.WVW_DB);
    const rows = await db
      .select({
        id: events.id,
        match_id: events.match_id,
        type: events.type,
        at: events.at,
        objective_id: events.objective_id,
        objective_type: events.objective_type,
        map_type: events.map_type,
        owner: events.owner,
        claimed_by: events.claimed_by,
        // Leading underscore marks this as an internal window-function column, stripped
        // from each row before the response is built below.
        _total: sql<number>`COUNT(*) OVER ()`,
      })
      .from(events)
      .where(and(...conditions))
      .orderBy(desc(events.id))
      .limit(limit)
      .offset(offset);

    // eslint-disable-next-line no-underscore-dangle
    const total = rows[0]?._total ?? 0;
    const response: EventLogResponse = {
      events: rows.map(({ _total: _, ...row }) => row),
      total,
      limit,
      offset,
    };
    return c.json(response, 200, { 'Cache-Control': 'no-store' });
  },
);
