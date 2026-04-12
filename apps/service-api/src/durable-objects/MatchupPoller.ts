import { DurableObject } from 'cloudflare:workers';
import type { CloudflareEnv } from '#index.ts';
import type { WvWMatch, WvWMatchObjective, WvWMatchStripped } from '#lib/resources/wvw/matches.ts';

const POLL_INTERVAL_MS = 6_000;
const GW2_MATCHES_PATH = '/wvw/matches?ids=all';

interface ObjectiveSnap {
  owner: string;
  last_flipped: string | null | undefined;
  claimed_by: string | null | undefined;
  claimed_at: string | null | undefined;
}

type ObjectiveSnapMap = Map<string, ObjectiveSnap>; // key: `${matchId}:${objectiveId}`

export class MatchupPoller extends DurableObject<CloudflareEnv> {
  #objectiveSnap: ObjectiveSnapMap = new Map<string, ObjectiveSnap>();
  #matchEndTimes: Map<string, string> = new Map<string, string>();

  constructor(ctx: DurableObjectState, env: CloudflareEnv) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      await this.#rebuildFromD1();
      // Only set alarm if one isn't already scheduled — avoids interfering with
      // an alarm that fired and is executing right now (constructor runs before alarm handler on wake).
      const existing = await ctx.storage.getAlarm();
      if (existing == null) {
        void ctx.storage.setAlarm(Date.now() + POLL_INTERVAL_MS);
      }
    });
  }

  async alarm(): Promise<void> {
    try {
      await this.#poll();
    } catch (err) {
      console.error('[MatchupPoller] alarm error:', err);
    } finally {
      // Always reschedule — ensures the loop continues even after errors.
      await this.ctx.storage.setAlarm(Date.now() + POLL_INTERVAL_MS);
    }
  }

  async fetch(_request: Request): Promise<Response> {
    const alarm = await this.ctx.storage.getAlarm();
    return Response.json({
      status: 'ok',
      nextAlarmAt: alarm,
      matchCount: this.#matchEndTimes.size,
      objectiveCount: this.#objectiveSnap.size,
    });
  }

  async #poll(): Promise<void> {
    if (!this.env.GW2_API_KEY) {
      console.warn('[MatchupPoller] GW2_API_KEY not set — skipping poll');
      return;
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.env.GW2_API_KEY}`,
      'User-Agent': 'gw2w2w.com',
    };

    const response = await fetch(`${this.env.GW2_API_BASE}${GW2_MATCHES_PATH}`, { headers });

    if (!response.ok) {
      throw new Error(`[MatchupPoller] GW2 API error: ${response.status.toString()} ${response.statusText}`);
    }

    const matches = await response.json<WvWMatch[]>();
    const now = new Date().toISOString();

    // Collect all D1 write statements and in-memory updates to apply after a successful batch.
    const stmts: D1PreparedStatement[] = [];
    const snapUpdates: { key: string; snap: ObjectiveSnap }[] = [];
    const endTimeUpdates: { matchId: string; endTime: string }[] = [];
    const resetMatchIds: string[] = [];
    let newEventCount = 0;

    for (const match of matches) {
      // --- Reset detection ---
      // NA (1-x) resets Friday ~02:00 UTC; EU (2-x) resets Saturday ~01:00 UTC.
      // Each match is checked independently — they reset at different times and
      // the single global DO handles all 9 matches in one alarm loop.
      // Detection via end_time string equality is robust against ArenaNet delays
      // and avoids hardcoding day/time logic.
      const prevEndTime = this.#matchEndTimes.get(match.id);
      if (prevEndTime != null && prevEndTime !== match.end_time) {
        console.info(`[MatchupPoller] Weekly reset detected for match ${match.id}`);
        resetMatchIds.push(match.id);
        stmts.push(this.env.WVW_DB.prepare('DELETE FROM events WHERE match_id = ?').bind(match.id));
      }

      // --- Match state upsert ---
      const { skirmishes: _skirmishes, ...stripped } = match;
      const strippedData: WvWMatchStripped = stripped;
      stmts.push(
        this.env.WVW_DB.prepare(
          'INSERT OR REPLACE INTO match_state (match_id, data, end_time, updated_at) VALUES (?, ?, ?, ?)',
        ).bind(match.id, JSON.stringify(strippedData), match.end_time, now),
      );

      endTimeUpdates.push({ matchId: match.id, endTime: match.end_time });

      // --- Objective diff ---
      for (const map of match.maps) {
        for (const obj of map.objectives) {
          const snapKey = `${match.id}:${obj.id}`;
          const prev = this.#objectiveSnap.get(snapKey);

          if (this.#shouldEmitCapture(obj, prev)) {
            newEventCount++;
            stmts.push(
              this.env.WVW_DB.prepare(
                'INSERT OR IGNORE INTO events (match_id, type, at, objective_id, objective_type, map_type, owner, claimed_by) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)',
              ).bind(match.id, 'capture', obj.last_flipped, obj.id, obj.type, map.type, obj.owner),
            );
          }

          if (this.#shouldEmitClaim(obj, prev)) {
            newEventCount++;
            stmts.push(
              this.env.WVW_DB.prepare(
                'INSERT OR IGNORE INTO events (match_id, type, at, objective_id, objective_type, map_type, owner, claimed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              ).bind(match.id, 'claim', obj.claimed_at, obj.id, obj.type, map.type, obj.owner, obj.claimed_by),
            );
          }

          snapUpdates.push({
            key: snapKey,
            snap: {
              owner: obj.owner,
              last_flipped: obj.last_flipped,
              claimed_by: obj.claimed_by,
              claimed_at: obj.claimed_at,
            },
          });
        }
      }
    }

    // --- Execute all writes atomically ---
    if (stmts.length > 0) {
      await this.env.WVW_DB.batch(stmts);
    }

    console.info(`[MatchupPoller] poll complete — ${matches.length} matches, ${newEventCount} new events`);

    // --- Update in-memory state after successful batch ---
    for (const matchId of resetMatchIds) {
      for (const key of this.#objectiveSnap.keys()) {
        if (key.startsWith(`${matchId}:`)) {
          this.#objectiveSnap.delete(key);
        }
      }
    }

    for (const { matchId, endTime } of endTimeUpdates) {
      this.#matchEndTimes.set(matchId, endTime);
    }

    for (const { key, snap } of snapUpdates) {
      this.#objectiveSnap.set(key, snap);
    }
  }

  async #rebuildFromD1(): Promise<void> {
    const { results } = await this.env.WVW_DB.prepare('SELECT match_id, data, end_time FROM match_state').all<{
      match_id: string;
      data: string;
      end_time: string;
    }>();

    if (results.length === 0) {
      console.info('[MatchupPoller] cold start — no match_state in D1, will seed on first poll');
      return;
    }

    console.info(`[MatchupPoller] cold start — rebuilt from D1: ${results.length} matches`);

    for (const row of results) {
      this.#matchEndTimes.set(row.match_id, row.end_time);
      const match = JSON.parse(row.data) as WvWMatchStripped;
      for (const map of match.maps) {
        for (const obj of map.objectives) {
          this.#objectiveSnap.set(`${row.match_id}:${obj.id}`, {
            owner: obj.owner,
            last_flipped: obj.last_flipped,
            claimed_by: obj.claimed_by,
            claimed_at: obj.claimed_at,
          });
        }
      }
    }
  }

  #shouldEmitCapture(obj: WvWMatchObjective, prev: ObjectiveSnap | undefined): boolean {
    if (!obj.last_flipped) return false;
    return obj.last_flipped !== prev?.last_flipped;
  }

  #shouldEmitClaim(obj: WvWMatchObjective, prev: ObjectiveSnap | undefined): boolean {
    return obj.claimed_at != null && obj.claimed_by != null && obj.claimed_at !== prev?.claimed_at;
  }
}
