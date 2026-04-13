import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv } from '#index.ts';
import { getDb } from '#db/index.ts';
import { events } from '#db/schema.ts';
import { and, desc, eq, gte, inArray, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

export type EventRow = typeof events.$inferSelect;

export interface EventLogResponse {
  events: EventRow[];
  nextCursor: number | null;
}

const MAP_TYPES = ['Center', 'RedHome', 'BlueHome', 'GreenHome'] as const;
const OBJECTIVE_TYPES = ['Camp', 'Tower', 'Keep', 'Castle', 'Ruins'] as const;
const EVENT_TYPES = ['capture', 'claim'] as const;
const OWNER_VALUES = ['Red', 'Blue', 'Green', 'Neutral'] as const;

const querySchema = z.object({
  matchId: z.string().regex(/^\d-\d$/),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.coerce.number().int().positive().optional(),
  mapType: z
    .union([z.enum(MAP_TYPES), z.array(z.enum(MAP_TYPES))])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  objectiveType: z
    .union([z.enum(OBJECTIVE_TYPES), z.array(z.enum(OBJECTIVE_TYPES))])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  eventType: z
    .union([z.enum(EVENT_TYPES), z.array(z.enum(EVENT_TYPES))])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  owner: z
    .union([z.enum(OWNER_VALUES), z.array(z.enum(OWNER_VALUES))])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  maxAge: z.coerce.number().int().min(1).optional(),
});

export const apiWvwEventsRoute = new Hono<{ Bindings: CloudflareEnv }>().get(
  '/',
  zValidator('query', querySchema),
  async (c) => {
    const { matchId, limit, before, mapType, objectiveType, eventType, owner, maxAge } = c.req.valid('query');

    const conditions = [eq(events.match_id, matchId)];

    if (before != null) conditions.push(lt(events.id, before));
    if (mapType?.length) conditions.push(inArray(events.map_type, [...mapType]));
    if (objectiveType?.length) conditions.push(inArray(events.objective_type, [...objectiveType]));
    if (eventType?.length) conditions.push(inArray(events.type, [...eventType]));
    if (owner?.length) conditions.push(inArray(events.owner, [...owner]));
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
      .limit(limit);

    const nextCursor = rows.length === limit ? (rows.at(-1)?.id ?? null) : null;

    const response: EventLogResponse = { events: rows, nextCursor };
    return c.json(response);
  },
);
