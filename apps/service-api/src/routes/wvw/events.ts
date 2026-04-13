import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv } from '#index.ts';
import { Hono } from 'hono';
import { z } from 'zod';

export interface EventRow {
  id: number;
  match_id: string;
  type: 'capture' | 'claim';
  at: string;
  objective_id: string;
  objective_type: string;
  map_type: string;
  owner: string;
  claimed_by: string | null;
}

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

    const conditions: string[] = ['match_id = ?'];
    const params: (string | number)[] = [matchId];

    if (before != null) {
      conditions.push('id < ?');
      params.push(before);
    }

    if (mapType && mapType.length > 0) {
      conditions.push(`map_type IN (${mapType.map(() => '?').join(', ')})`);
      params.push(...mapType);
    }

    if (objectiveType && objectiveType.length > 0) {
      conditions.push(`objective_type IN (${objectiveType.map(() => '?').join(', ')})`);
      params.push(...objectiveType);
    }

    if (eventType && eventType.length > 0) {
      conditions.push(`type IN (${eventType.map(() => '?').join(', ')})`);
      params.push(...eventType);
    }

    if (owner && owner.length > 0) {
      conditions.push(`owner IN (${owner.map(() => '?').join(', ')})`);
      params.push(...owner);
    }

    if (maxAge != null) {
      const cutoff = new Date(Date.now() - maxAge * 1_000).toISOString();
      conditions.push('at >= ?');
      params.push(cutoff);
    }

    params.push(limit);

    const sql = `SELECT id, match_id, type, at, objective_id, objective_type, map_type, owner, claimed_by
      FROM events
      WHERE ${conditions.join(' AND ')}
      ORDER BY id DESC
      LIMIT ?`;

    const { results } = await c.env.WVW_DB.prepare(sql)
      .bind(...params)
      .all<EventRow>();

    const nextCursor = results.length === limit ? (results.at(-1)?.id ?? null) : null;

    const response: EventLogResponse = { events: results, nextCursor };
    return c.json(response);
  },
);
