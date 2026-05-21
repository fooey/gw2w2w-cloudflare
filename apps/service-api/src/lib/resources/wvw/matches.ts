import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { z } from 'zod';

// Generic helper — produces { red: T, blue: T, green: T } for any inner schema T
const wvwMatchTeams = <T extends z.ZodType>(inner: T) => z.object({ red: inner, blue: inner, green: inner });

export const WvWTeamColorSchema = z
  .enum(['Red', 'Blue', 'Green', 'Neutral'])
  .describe('Team colour in a WvW matchup; Neutral applies to unowned objectives');
export const WvWMapTypeSchema = z
  .enum(['Center', 'RedHome', 'BlueHome', 'GreenHome'])
  .describe('WvW map type within a matchup');

export const WvWMatchObjectiveSchema = z
  .object({
    id: z.string(),
    type: z.enum(['Spawn', 'Camp', 'Ruins', 'Tower', 'Keep', 'Castle', 'Mercenary', 'Generic', 'Resource']),
    owner: WvWTeamColorSchema,
    last_flipped: z
      .string()
      .nullish()
      .describe('ISO 8601 timestamp of the last ownership change; null for never-captured objectives'),
    claimed_by: z.string().nullish().optional().describe('Guild ID of the claiming guild; null if unclaimed'),
    claimed_at: z.string().nullish().optional().describe('ISO 8601 timestamp when the guild claim was placed'),
    points_tick: z.number().describe('Victory points earned per tick while this objective is held'),
    points_capture: z.number().describe('Victory points awarded for capturing this objective'),
    guild_upgrades: z
      .array(z.number())
      .optional()
      .describe('Guild upgrade IDs the claiming guild has activated on this objective'),
    yaks_delivered: z
      .number()
      .optional()
      .describe('Total dolyak deliveries to this objective in the current upgrade tier'),
  })
  .describe('Real-time state of a single WvW objective within a live match');

export const WvWMatchMapSchema = z
  .object({
    id: z.number(),
    type: WvWMapTypeSchema,
    scores: wvwMatchTeams(z.number()).describe('Current score per team on this map'),
    bonuses: z
      .array(z.object({ type: z.string(), owner: WvWTeamColorSchema }))
      .describe('Active map bonuses and their controlling team'),
    objectives: z.array(WvWMatchObjectiveSchema),
    deaths: wvwMatchTeams(z.number()).describe('Death count per team on this map'),
    kills: wvwMatchTeams(z.number()).describe('Kill count per team on this map'),
  })
  .describe('Per-map breakdown of scores, objectives, and kills/deaths within a match');

export const WvWMatchSkirmishSchema = z
  .object({
    id: z.number().describe('Skirmish number within the matchup (1-indexed, oldest first)'),
    scores: wvwMatchTeams(z.number()).describe('Score per team earned during this skirmish'),
    map_scores: z
      .array(
        z.object({
          type: WvWMapTypeSchema,
          scores: wvwMatchTeams(z.number()),
        }),
      )
      .describe('Per-map score breakdown for this skirmish'),
  })
  .describe('Score breakdown for a single 2-hour skirmish period');

export const WvWMatchSchema = z
  .object({
    id: z.string().describe('Match ID in region-number format (e.g. "1-1" for NA tier 1)'),
    start_time: z.string().describe('ISO 8601 timestamp of the matchup reset'),
    end_time: z.string().describe('ISO 8601 timestamp when the matchup ends'),
    scores: wvwMatchTeams(z.number()).describe('Cumulative victory point totals per team'),
    worlds: wvwMatchTeams(z.number()).describe('Primary linked world ID per team'),
    all_worlds: wvwMatchTeams(z.array(z.number())).describe('All world IDs per team, including guest-linked worlds'),
    deaths: wvwMatchTeams(z.number()).describe('Total deaths across all maps per team'),
    kills: wvwMatchTeams(z.number()).describe('Total kills across all maps per team'),
    victory_points: wvwMatchTeams(z.number()).describe('Cumulative victory points per team'),
    skirmishes: z
      .array(WvWMatchSkirmishSchema)
      .describe('2-hour skirmish periods within this matchup, ordered oldest first'),
    maps: z.array(WvWMatchMapSchema),
  })
  .describe('Full WvW matchup snapshot from /v2/wvw/matches');

export type WvWTeamColor = z.infer<typeof WvWTeamColorSchema>;
export type WvWMapType = z.infer<typeof WvWMapTypeSchema>;
export type WvWMatchObjective = z.infer<typeof WvWMatchObjectiveSchema>;
export type WvWMatchMap = z.infer<typeof WvWMatchMapSchema>;
export type WvWMatchSkirmish = z.infer<typeof WvWMatchSkirmishSchema>;
export type WvWMatch = z.infer<typeof WvWMatchSchema>;
export interface WvWMatchTeams<T> {
  red: T;
  blue: T;
  green: T;
}

/** WvWMatch with skirmishes[] omitted — the shape stored in D1 match_state and pushed over SSE */
export type WvWMatchStripped = Omit<WvWMatch, 'skirmishes'>;

function getWvWMatchesFromApi(env: CloudflareEnv): Promise<WvWMatch[] | null> {
  return apiFetch(env, '/wvw/matches?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
    return response.json<WvWMatch[]>();
  });
}

export async function getWvWMatches(id: string | string[], env: CloudflareEnv): Promise<WvWMatch[]> {
  return withFilteredObjectCache<WvWMatch>(
    'wvw-matches.json',
    id,
    () => getWvWMatchesFromApi(env),
    createCacheProviders(env),
    {
      ttl: CACHE_TTL.live.kv,
    },
  );
}

export async function getWvWMatchByWorld(worldId: number, env: CloudflareEnv): Promise<WvWMatch | null> {
  const matches = await getWvWMatches('all', env);
  return (
    matches.find(
      (m) =>
        m.all_worlds.red.includes(worldId) ||
        m.all_worlds.blue.includes(worldId) ||
        m.all_worlds.green.includes(worldId),
    ) ?? null
  );
}
