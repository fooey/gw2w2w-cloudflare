import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { apiFetch } from '@service-api/lib/resources/api';
import { withFilteredObjectCache } from '@service-api/lib/resources/cache-wrapper';

export interface WvWMatchTeams<T> {
  red: T;
  blue: T;
  green: T;
}

export interface WvWMatchSkirmish {
  id: number;
  scores: WvWMatchTeams<number>;
  map_scores: Array<{
    type: string;
    scores: WvWMatchTeams<number>;
  }>;
}

export interface WvWMatchObjective {
  id: string;
  type: string;
  owner: 'Red' | 'Blue' | 'Green' | 'Neutral';
  last_flipped: string;
  claimed_by?: string;
  claimed_at?: string;
  points_tick: number;
  points_capture: number;
  guild_upgrades: number[];
  yaks_delivered?: number;
}

export interface WvWMatchMap {
  id: number;
  type: string;
  scores: WvWMatchTeams<number>;
  bonuses: Array<{ type: string; owner: string }>;
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

const MATCHES_TTL = 60; // 1 minute — match data changes frequently

function getWvWMatchesFromApi(env: CloudflareEnv): Promise<WvWMatch[] | null> {
  return apiFetch(env, '/wvw/matches?ids=all').then((response) => {
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
    }
    return response.json();
  });
}

export async function getWvWMatches(id: string | string[], env: CloudflareEnv): Promise<WvWMatch[]> {
  return withFilteredObjectCache('wvw-matches.json', id, () => getWvWMatchesFromApi(env), createCacheProviders(env), {
    ttl: MATCHES_TTL,
  });
}
