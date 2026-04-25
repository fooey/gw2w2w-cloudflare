import type { CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { apiFetch } from '#lib/resources/api.ts';
import { withFilteredObjectCache } from '#lib/resources/cache-wrapper.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import type { WvWObjective } from '#lib/resources/wvw/objectives.ts';

export interface WvWMatchTeams<T> {
  red: T;
  blue: T;
  green: T;
}

export interface WvWMatchSkirmish {
  id: number;
  scores: WvWMatchTeams<number>;
  map_scores: {
    type: WvWMapType;
    scores: WvWMatchTeams<number>;
  }[];
}

export type WvWTeamColor = 'Red' | 'Blue' | 'Green' | 'Neutral';

export type WvWMapType = 'Center' | 'RedHome' | 'BlueHome' | 'GreenHome';

export interface WvWMatchObjective {
  id: string;
  type: WvWObjective['type'];
  owner: WvWTeamColor;
  last_flipped: string | null | undefined;
  /** Present on claimable objectives (Camp/Tower/Keep/Castle), absent on Spawn/Ruins. Null when unclaimed. */
  claimed_by?: string | null;
  /** Present on claimable objectives (Camp/Tower/Keep/Castle), absent on Spawn/Ruins. Null when unclaimed. */
  claimed_at?: string | null;
  points_tick: number;
  points_capture: number;
  /** Absent on unclaimable objectives (Spawn, Ruins). */
  guild_upgrades?: number[];
  /** Absent on unclaimable objectives (Spawn, Ruins). */
  yaks_delivered?: number;
}

export interface WvWMatchMap {
  id: number;
  type: WvWMapType;
  scores: WvWMatchTeams<number>;
  bonuses: { type: string; owner: WvWTeamColor }[];
  objectives: WvWMatchObjective[];
  deaths: WvWMatchTeams<number>;
  kills: WvWMatchTeams<number>;
}

export interface WvWMatch {
  id: string;
  start_time: string;
  end_time: string;
  scores: WvWMatchTeams<number>;
  worlds: WvWMatchTeams<number>;
  all_worlds: WvWMatchTeams<number[]>;
  deaths: WvWMatchTeams<number>;
  kills: WvWMatchTeams<number>;
  victory_points: WvWMatchTeams<number>;
  skirmishes: WvWMatchSkirmish[];
  maps: WvWMatchMap[];
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
