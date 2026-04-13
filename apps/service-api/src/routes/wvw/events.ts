import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv } from '#index.ts';
import { getDb } from '#db/index.ts';
import { events } from '#db/schema.ts';
import { and, desc, eq, gte } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

export type EventRow = typeof events.$inferSelect;

export interface EventLogResponse {
  events: EventRow[];
}

// Safety cap for unbounded queries (timeWindow="all"). 500 events covers ~1–3 days
// of active WvW; the SSE stream delivers anything newer in real time.
const UNBOUNDED_LIMIT = 500;

const querySchema = z.object({
  matchId: z.string().regex(/^\d-\d$/),
  // maxAge in seconds — omit for the "all" time window
  maxAge: z.coerce.number().int().min(1).optional(),
});

export const apiWvwEventsRoute = new Hono<{ Bindings: CloudflareEnv }>().get(
  '/',
  zValidator('query', querySchema),
  async (c) => {
    const { matchId, maxAge } = c.req.valid('query');

    const conditions = [eq(events.match_id, matchId)];

    if (maxAge != null) {
      // GW2 stores timestamps as "YYYY-MM-DDTHH:mm:ssZ" (no milliseconds).
      // Truncate the cutoff to seconds so SQLite's lexicographic comparison is correct.
      const cutoff = new Date(Date.now() - maxAge * 1_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
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
      })
      .from(events)
      .where(and(...conditions))
      .orderBy(desc(events.id))
      .limit(UNBOUNDED_LIMIT);

    const response: EventLogResponse = { events: rows };
    return c.json(response);
  },
);
