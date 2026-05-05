import type { CloudflareEnv } from '#index.ts';
import { getDb } from '#db/index.ts';
import { events } from '#db/schema.ts';
import { and, asc, count, desc, eq, gte, inArray, sql, type SQL } from 'drizzle-orm';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';

export interface GuildActivityRow {
  guild_id: string;
  match_id: string;
  claims_castle: number;
  claims_keep: number;
  claims_tower: number;
  claims_camp: number;
  claims_center: number;
  claims_green_home: number;
  claims_blue_home: number;
  claims_red_home: number;
  total: number;
  last_seen_at: string;
  last_activity_owner: string;
  last_activity_map: string;
}

export interface GuildActivityResponse {
  guilds: GuildActivityRow[];
  total: number;
  page: number;
  pages: number;
}

const SORT_COLUMNS = [
  'total',
  'last_seen_at',
  'claims_castle',
  'claims_keep',
  'claims_tower',
  'claims_camp',
  'claims_center',
  'claims_green_home',
  'claims_blue_home',
  'claims_red_home',
] as const;

// Maps each sort key to the SQL expression it represents in the GROUP BY query.
// Cannot use column aliases in ORDER BY since Drizzle's sql<> templates don't
// emit AS aliases into SQL — they are TypeScript-only property names.
const SORT_SQL = {
  total: sql`COUNT(*)`,
  last_seen_at: sql`MAX(${events.at})`,
  claims_castle: sql`COUNT(*) FILTER (WHERE ${events.objective_type} = 'Castle')`,
  claims_keep: sql`COUNT(*) FILTER (WHERE ${events.objective_type} = 'Keep')`,
  claims_tower: sql`COUNT(*) FILTER (WHERE ${events.objective_type} = 'Tower')`,
  claims_camp: sql`COUNT(*) FILTER (WHERE ${events.objective_type} = 'Camp')`,
  claims_center: sql`COUNT(*) FILTER (WHERE ${events.map_type} = 'Center')`,
  claims_green_home: sql`COUNT(*) FILTER (WHERE ${events.map_type} = 'GreenHome')`,
  claims_blue_home: sql`COUNT(*) FILTER (WHERE ${events.map_type} = 'BlueHome')`,
  claims_red_home: sql`COUNT(*) FILTER (WHERE ${events.map_type} = 'RedHome')`,
} satisfies Record<(typeof SORT_COLUMNS)[number], SQL>;

const MAP_TYPES = ['Center', 'RedHome', 'BlueHome', 'GreenHome'] as const;
const OBJECTIVE_TYPES = ['Camp', 'Tower', 'Keep', 'Castle'] as const;
const OWNER_VALUES = ['Red', 'Blue', 'Green', 'Neutral'] as const;

const querySchema = z.object({
  matchId: z.string().regex(/^\d-\d$/),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(0).default(0),
  sort: z.enum(SORT_COLUMNS).default('total'),
  order: z.enum(['asc', 'desc']).default('desc'),
  maxAge: z.coerce.number().int().min(1).optional(),
  mapType: z
    .union([z.enum(MAP_TYPES), z.array(z.enum(MAP_TYPES))])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  objectiveType: z
    .union([z.enum(OBJECTIVE_TYPES), z.array(z.enum(OBJECTIVE_TYPES))])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  owner: z
    .union([z.enum(OWNER_VALUES), z.array(z.enum(OWNER_VALUES))])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
});

export const apiWvwGuildsRoute = new Hono<{ Bindings: CloudflareEnv }>().get(
  '/',
  describeRoute({
    summary: 'Query WvW guild activity',
    description:
      'Returns paginated guild claim activity for a match with filtering by map type, objective type, owner, and time window.',
    tags: ['WvW Guilds'],
    responses: { 200: { description: 'Paginated guild activity response' } },
  }),
  validator('query', querySchema),
  async (c) => {
    const { matchId, limit, page, sort, order, maxAge, mapType, objectiveType, owner } = c.req.valid('query');

    // Build shared WHERE conditions for both count and data queries.
    const conditions = [eq(events.match_id, matchId), eq(events.type, 'claim')];

    if (maxAge != null) {
      // GW2 stores timestamps as "YYYY-MM-DDTHH:mm:ssZ" (no milliseconds).
      // Truncate the cutoff to seconds so SQLite's lexicographic comparison is correct.
      const cutoff = new Date(Date.now() - maxAge * 1_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
      conditions.push(gte(events.at, cutoff));
    }
    if (mapType?.length) conditions.push(inArray(events.map_type, Array.from(mapType)));
    if (objectiveType?.length) conditions.push(inArray(events.objective_type, Array.from(objectiveType)));
    if (owner?.length) conditions.push(inArray(events.owner, Array.from(owner)));

    const whereExpr: SQL = and(...conditions) ?? eq(events.match_id, matchId);

    const db = getDb(c.env.WVW_DB);

    // Count distinct guilds matching the filters.
    const subq = db
      .select({ claimed_by: events.claimed_by })
      .from(events)
      .where(whereExpr)
      .groupBy(events.claimed_by)
      .as('sub');

    // sort and order are enum-validated and key into SORT_SQL above.
    const orderExpr = order === 'desc' ? desc(SORT_SQL[sort]) : asc(SORT_SQL[sort]);

    const [countRows, guilds] = await Promise.all([
      db.select({ total: count() }).from(subq),
      db
        .select({
          guild_id: sql<string>`${events.claimed_by}`,
          match_id: events.match_id,
          claims_castle: sql<number>`COUNT(*) FILTER (WHERE ${events.objective_type} = 'Castle')`,
          claims_keep: sql<number>`COUNT(*) FILTER (WHERE ${events.objective_type} = 'Keep')`,
          claims_tower: sql<number>`COUNT(*) FILTER (WHERE ${events.objective_type} = 'Tower')`,
          claims_camp: sql<number>`COUNT(*) FILTER (WHERE ${events.objective_type} = 'Camp')`,
          claims_center: sql<number>`COUNT(*) FILTER (WHERE ${events.map_type} = 'Center')`,
          claims_green_home: sql<number>`COUNT(*) FILTER (WHERE ${events.map_type} = 'GreenHome')`,
          claims_blue_home: sql<number>`COUNT(*) FILTER (WHERE ${events.map_type} = 'BlueHome')`,
          claims_red_home: sql<number>`COUNT(*) FILTER (WHERE ${events.map_type} = 'RedHome')`,
          total: sql<number>`COUNT(*)`,
          last_seen_at: sql<string>`MAX(${events.at})`,
          last_activity_owner: events.owner,
          last_activity_map: events.map_type,
        })
        .from(events)
        .where(whereExpr)
        .groupBy(events.claimed_by, events.match_id)
        .orderBy(orderExpr)
        .limit(limit)
        .offset(page * limit),
    ]);

    const totalCount = countRows[0]?.total ?? 0;
    const pages = Math.ceil(totalCount / limit);

    const response: GuildActivityResponse = { guilds, total: totalCount, page, pages };
    return c.json(response);
  },
);
