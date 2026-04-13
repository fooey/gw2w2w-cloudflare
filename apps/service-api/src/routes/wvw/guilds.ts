import { zValidator } from '@hono/zod-validator';
import { type CloudflareEnv } from '#index.ts';
import { Hono } from 'hono';
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
  zValidator('query', querySchema),
  async (c) => {
    const { matchId, limit, page, sort, order, maxAge, mapType, objectiveType, owner } = c.req.valid('query');

    const havingConditions: string[] = [];
    const filterConditions: string[] = [];
    const params: (string | number)[] = [matchId];

    if (maxAge != null) {
      const cutoff = new Date(Date.now() - maxAge * 1_000).toISOString();
      filterConditions.push('at >= ?');
      params.push(cutoff);
    }

    if (mapType && mapType.length > 0) {
      filterConditions.push(`map_type IN (${mapType.map(() => '?').join(', ')})`);
      params.push(...mapType);
    }

    if (objectiveType && objectiveType.length > 0) {
      filterConditions.push(`objective_type IN (${objectiveType.map(() => '?').join(', ')})`);
      params.push(...objectiveType);
    }

    if (owner && owner.length > 0) {
      filterConditions.push(`owner IN (${owner.map(() => '?').join(', ')})`);
      params.push(...owner);
    }

    const whereClause =
      filterConditions.length > 0
        ? `match_id = ? AND type = 'claim' AND ${filterConditions.join(' AND ')}`
        : `match_id = ? AND type = 'claim'`;

    const havingClause = havingConditions.length > 0 ? `HAVING ${havingConditions.join(' AND ')}` : '';

    // Sort column is validated against the enum — safe to interpolate.
    const orderClause = `ORDER BY ${sort} ${order.toUpperCase()}`;

    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT claimed_by
        FROM events
        WHERE ${whereClause}
        GROUP BY claimed_by
        ${havingClause}
      )`;

    const dataSql = `
      SELECT
        claimed_by                                                        AS guild_id,
        match_id,
        COUNT(*) FILTER (WHERE objective_type = 'Castle')                 AS claims_castle,
        COUNT(*) FILTER (WHERE objective_type = 'Keep')                   AS claims_keep,
        COUNT(*) FILTER (WHERE objective_type = 'Tower')                  AS claims_tower,
        COUNT(*) FILTER (WHERE objective_type = 'Camp')                   AS claims_camp,
        COUNT(*) FILTER (WHERE map_type = 'Center')                       AS claims_center,
        COUNT(*) FILTER (WHERE map_type = 'GreenHome')                    AS claims_green_home,
        COUNT(*) FILTER (WHERE map_type = 'BlueHome')                     AS claims_blue_home,
        COUNT(*) FILTER (WHERE map_type = 'RedHome')                      AS claims_red_home,
        COUNT(*)                                                          AS total,
        MAX(at)                                                           AS last_seen_at,
        owner                                                             AS last_activity_owner,
        map_type                                                          AS last_activity_map
      FROM events
      WHERE ${whereClause}
      GROUP BY claimed_by, match_id
      ${havingClause}
      ${orderClause}
      LIMIT ? OFFSET ?`;

    // Count query uses same params (no limit/offset); data query adds limit + offset.
    const [countResult, dataResult] = await c.env.WVW_DB.batch([
      c.env.WVW_DB.prepare(countSql).bind(...params),
      c.env.WVW_DB.prepare(dataSql).bind(...params, limit, page * limit),
    ]);

    if (!countResult || !dataResult) {
      return c.json({ error: 'Internal Server Error' }, 500);
    }

    const totalCount = (countResult.results[0] as { total: number } | undefined)?.total ?? 0;
    const guilds = dataResult.results as GuildActivityRow[];
    const pages = Math.ceil(totalCount / limit);

    const response: GuildActivityResponse = { guilds, total: totalCount, page, pages };
    return c.json(response);
  },
);
