import type { CloudflareEnv } from '#index.ts';
import type { WvWMatch, WvWMatchObjective, WvWMatchStripped } from '#lib/resources/wvw/matches.ts';
import { DurableObject } from 'cloudflare:workers';

const POLL_INTERVAL_MS = 20_000;
const BACKOFF_INTERVAL_MS = 60_000; // back off 1 minute on 429
// GW2 API rate limit parameters (observed from x-rate-limit-limit response header)
// Bucket: 600 requests, refill: ~5 req/s
const GW2_RATE_LIMIT_REFILL = '~5 req/s';
const GW2_MATCHES_PATH = '/wvw/matches?ids=all';
// Cap replay to avoid large D1 reads on reconnect after a long disconnect.
const MAX_REPLAY_EVENTS = 500;
// Maximum time to wait for a single SSE subscriber write before treating the
// connection as a zombie and dropping it. Without this, a stalled write in
// #fanout() will block the alarm handler indefinitely.
const SSE_WRITE_TIMEOUT_MS = 500;

interface ObjectiveSnap {
  owner: string;
  last_flipped: string | null | undefined;
  claimed_by: string | null | undefined;
  claimed_at: string | null | undefined;
}

type ObjectiveSnapMap = Map<string, ObjectiveSnap>; // key: `${matchId}:${objectiveId}`

interface Subscriber {
  matchId: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
}

// Tracks a pending SSE fanout for a capture or claim INSERT.
// Kept in a parallel array alongside stmts so we can correlate batch results.
interface PendingFanout {
  matchId: string;
  type: 'capture' | 'claim';
  data: Record<string, unknown>;
}

interface MatchStateFanout {
  matchId: string;
  data: WvWMatchStripped;
  json: string; // pre-computed JSON string — reused for cache update to avoid re-stringify
}

interface EventRow {
  id: number;
  type: string;
  at: string;
  objective_id: string;
  objective_type: string;
  map_type: string;
  owner: string;
  claimed_by: string | null;
}

class RateLimitError extends Error {
  retryAfterMs: number;
  rateLimitBurst: number | null;
  egressIp: string | null;
  constructor(retryAfterMs: number, rateLimitBurst: number | null = null, egressIp: string | null = null) {
    super(`[MatchupPoller] GW2 API rate limited — retry after ${retryAfterMs}ms`);
    this.retryAfterMs = retryAfterMs;
    this.rateLimitBurst = rateLimitBurst;
    this.egressIp = egressIp;
  }
}

export class MatchupPoller extends DurableObject<CloudflareEnv> {
  #objectiveSnap: ObjectiveSnapMap = new Map<string, ObjectiveSnap>();
  #matchEndTimes: Map<string, string> = new Map<string, string>();
  // Tracks the last-seen JSON for each match so we can skip D1 writes and fanout
  // when match state hasn't changed (common between skirmish score ticks).
  #matchStateJson: Map<string, string> = new Map<string, string>();
  #subscribers: Map<string, Subscriber> = new Map<string, Subscriber>();
  #encoder = new TextEncoder();

  // Observability counters — reset on cold start, exposed via /status.
  #consecutiveRateLimits = 0;
  #lastRateLimitAt: string | null = null;
  #lastSuccessfulPollAt: string | null = null;

  constructor(ctx: DurableObjectState, env: CloudflareEnv) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      try {
        await this.#rebuildFromD1();
      } catch (err) {
        // If D1 rebuild fails, log and continue — cold-start state will be empty
        // but the alarm loop must not be disrupted. The next poll will re-seed.
        console.error('[MatchupPoller] rebuildFromD1 failed, starting cold:', err);
      }
      // Only set alarm if one isn't already scheduled — avoids interfering with
      // an alarm that fired and is executing right now (constructor runs before alarm handler on wake).
      const existing = await ctx.storage.getAlarm();
      // Also reschedule if the stored alarm is in the past — this happens when a
      // CPU kill consumes the alarm invocation before the handler can reschedule.
      if (existing == null || existing <= Date.now()) {
        await ctx.storage.setAlarm(Date.now() + POLL_INTERVAL_MS);
      }
    });
  }

  async alarm(): Promise<void> {
    // Reschedule FIRST — before any work — so eviction after poll can't kill the loop.
    await this.ctx.storage.setAlarm(Date.now() + POLL_INTERVAL_MS);
    try {
      await this.#poll();
    } catch (err) {
      if (err instanceof RateLimitError) {
        this.#consecutiveRateLimits++;
        this.#lastRateLimitAt = new Date().toISOString();
        const resumeAt = new Date(Date.now() + err.retryAfterMs).toISOString();
        const burst = err.rateLimitBurst ?? 'unknown';
        const ipSuffix = err.egressIp != null ? `, egressIp=${err.egressIp}` : '';
        console.warn(
          `[MatchupPoller] rate limited #${this.#consecutiveRateLimits} (burst=${burst}, refill=${GW2_RATE_LIMIT_REFILL}${ipSuffix})` +
            ` — backing off ${err.retryAfterMs}ms, resuming ~${resumeAt}`,
        );
        await this.ctx.storage.setAlarm(Date.now() + err.retryAfterMs);
      } else if (err instanceof DOMException && err.name === 'TimeoutError') {
        console.error('[MatchupPoller] alarm timed out — GW2 API fetch exceeded 10s deadline');
      } else {
        console.error('[MatchupPoller] alarm error:', err);
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/subscribe') {
      return this.#handleSubscribe(request);
    }

    if (url.pathname !== '/status') {
      return new Response('Not found', { status: 404 });
    }

    // Status endpoint
    const alarm = await this.ctx.storage.getAlarm();
    return Response.json({
      status: 'ok',
      nextAlarmAt: alarm,
      nextAlarmAtISO: alarm != null ? new Date(alarm).toISOString() : null,
      alarmIsStale: alarm != null && alarm <= Date.now(),
      matchCount: this.#matchEndTimes.size,
      objectiveCount: this.#objectiveSnap.size,
      subscriberCount: this.#subscribers.size,
      consecutiveRateLimits: this.#consecutiveRateLimits,
      lastRateLimitAt: this.#lastRateLimitAt,
      lastSuccessfulPollAt: this.#lastSuccessfulPollAt,
    });
  }

  async #handleSubscribe(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const matchId = url.searchParams.get('matchId');

    if (!matchId) {
      return new Response('matchId required', { status: 400 });
    }

    const matchRow = await this.env.WVW_DB.prepare('SELECT data, end_time FROM match_state WHERE match_id = ?')
      .bind(matchId)
      .first<{ data: string; end_time: string }>();

    if (!matchRow) {
      return new Response('Match not found', { status: 404 });
    }

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const subId = crypto.randomUUID();

    this.#subscribers.set(subId, { matchId, writer });
    console.info(`[MatchupPoller] subscriber connected: ${subId} (${matchId}), total=${this.#subscribers.size}`);

    request.signal.addEventListener('abort', () => {
      this.#subscribers.delete(subId);
      console.info(`[MatchupPoller] subscriber disconnected: ${subId} (${matchId}), total=${this.#subscribers.size}`);
      void writer.close().catch(() => {
        /* already closed */
      });
    });

    // IMPORTANT: seed AFTER returning the Response so the readable has a consumer.
    // Awaiting writer.write() before the Response is returned deadlocks when the
    // chunk size exceeds the TransformStream's internal buffer HWM — nothing is
    // reading the readable yet, so backpressure blocks the write indefinitely.
    this.ctx.waitUntil(
      this.#seedAndReplay(writer, matchId, matchRow, request.headers.get('last-event-id')).catch((err: unknown) => {
        console.error('[MatchupPoller] seed error:', err);
        this.#subscribers.delete(subId);
        void writer.close().catch(() => {
          /* already closed */
        });
      }),
    );

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }

  async #seedAndReplay(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    matchId: string,
    matchRow: { data: string; end_time: string },
    lastEventId: string | null,
  ): Promise<void> {
    // Always send current match state first so the client has fresh data.
    // Embed matchRow.data (already-serialized JSON) directly to avoid a
    // parse + re-stringify roundtrip on a potentially large payload.
    const seedMsg = `event: match-state\ndata: {"matchId":${JSON.stringify(matchId)},"data":${matchRow.data}}\n\n`;
    await writer.write(this.#encoder.encode(seedMsg));

    if (!lastEventId) return;

    // Last-Event-ID format: "{d1RowId}:{matchEndTime}"
    // The matchEndTime embedded in the id lets us detect weekly resets without an
    // extra D1 query — if end_time has advanced, the stored event ids are stale.
    const colonIdx = lastEventId.indexOf(':');
    if (colonIdx < 1) return;

    const lastId = parseInt(lastEventId.slice(0, colonIdx), 10);
    const lastEndTime = lastEventId.slice(colonIdx + 1);

    if (isNaN(lastId)) return;

    // Reset detected — D1 events were wiped, client's cursor is stale.
    // The fresh match-state seed above is sufficient; skip replay.
    if (lastEndTime !== matchRow.end_time) {
      console.info(`[MatchupPoller] reset detected on reconnect for ${matchId} — skipping replay`);
      return;
    }

    // Replay missed events in order, capped to avoid large reads.
    const { results } = await this.env.WVW_DB.prepare(
      'SELECT id, type, at, objective_id, objective_type, map_type, owner, claimed_by FROM events WHERE match_id = ? AND id > ? ORDER BY id ASC LIMIT ?',
    )
      .bind(matchId, lastId, MAX_REPLAY_EVENTS)
      .all<EventRow>();

    if (results.length === 0) return;

    console.info(`[MatchupPoller] replaying ${results.length} missed events for ${matchId} (since id=${lastId})`);

    // Build all replay messages and send in a single write to minimise CPU time
    // spent on repeated TextEncoder.encode() calls and backpressure checks.
    let payload = '';
    for (const row of results) {
      payload += `id: ${row.id}:${matchRow.end_time}\nevent: ${row.type}\ndata: ${JSON.stringify(this.#eventRowToPayload(matchId, row))}\n\n`;
    }
    await writer.write(this.#encoder.encode(payload));
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

    const response = await fetch(`${this.env.GW2_API_BASE}${GW2_MATCHES_PATH}`, {
      headers,
      // Without a timeout, a stalled GW2 API response hangs the alarm handler
      // indefinitely — the finally block never runs and the loop stops.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        const rateLimitHeaders: Record<string, string> = {};
        for (const [key, value] of response.headers.entries()) {
          if (key.toLowerCase().startsWith('x-rate-limit') || key.toLowerCase() === 'retry-after') {
            rateLimitHeaders[key] = value;
          }
        }
        // Fetch egress IP to identify which Cloudflare datacenter is being rate-limited.
        let egressIp: string | null = null;
        try {
          // very short timeout since this is just for observability and shouldn't delay the alarm handler significantly
          const trace = await fetch('https://1.1.1.1/cdn-cgi/trace', { signal: AbortSignal.timeout(200) });
          const text = await trace.text();
          egressIp = /^ip=(.+)$/m.exec(text)?.[1] ?? null;
        } catch {
          // non-critical — don't let this suppress the RateLimitError
        }
        console.info('[MatchupPoller] 429 headers:', JSON.stringify(rateLimitHeaders), 'egressIp:', egressIp);
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterMs = retryAfter != null ? parseInt(retryAfter, 10) * 1_000 : BACKOFF_INTERVAL_MS;
        const rateLimitBurstRaw = response.headers.get('x-rate-limit-limit');
        const rateLimitBurst = rateLimitBurstRaw != null ? parseInt(rateLimitBurstRaw, 10) : null;
        throw new RateLimitError(
          Number.isFinite(retryAfterMs) ? retryAfterMs : BACKOFF_INTERVAL_MS,
          rateLimitBurst,
          egressIp,
        );
      }
      throw new Error(`[MatchupPoller] GW2 API error: ${response.status.toString()} ${response.statusText}`);
    }

    const matches = await response.json<WvWMatch[]>();
    const now = new Date().toISOString();

    // Log all x-rate-limit-* headers on success so we can discover which ones GW2 actually sends.
    const rateLimitHeaders: Record<string, string> = {};
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase().startsWith('x-rate-limit')) {
        rateLimitHeaders[key] = value;
      }
    }
    if (Object.keys(rateLimitHeaders).length > 0) {
      const remaining = rateLimitHeaders['x-rate-limit-remaining'];
      const limit = rateLimitHeaders['x-rate-limit-limit'];
      if (remaining != null && limit != null && parseInt(remaining, 10) < parseInt(limit, 10) * 0.2) {
        // Budget low — log as warning so it stands out.
        console.warn('[MatchupPoller] rate limit budget low:', JSON.stringify(rateLimitHeaders));
      } else {
        console.info('[MatchupPoller] rate limit headers:', JSON.stringify(rateLimitHeaders));
      }
    }

    // Reset consecutive counter on successful poll.
    if (this.#consecutiveRateLimits > 0) {
      console.info(`[MatchupPoller] recovered after ${this.#consecutiveRateLimits} consecutive 429s`);
      this.#consecutiveRateLimits = 0;
    }
    this.#lastSuccessfulPollAt = now;

    // Collect all D1 write statements and in-memory updates to apply after a successful batch.
    // pendingFanout is a parallel array to stmts — null for non-event statements so we can
    // correlate batch results (meta.changes / last_row_id) back to their fanout data.
    const stmts: D1PreparedStatement[] = [];
    const pendingFanout: (PendingFanout | null)[] = [];
    const matchStateFanouts: MatchStateFanout[] = [];
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
        pendingFanout.push(null);
      }

      // --- Match state upsert (only when changed) ---
      const { skirmishes: _skirmishes, ...stripped } = match;
      const strippedData: WvWMatchStripped = stripped;
      const strippedJson = JSON.stringify(strippedData);
      const prevJson = this.#matchStateJson.get(match.id);
      const matchStateChanged = prevJson !== strippedJson;

      if (matchStateChanged) {
        stmts.push(
          this.env.WVW_DB.prepare(
            'INSERT OR REPLACE INTO match_state (match_id, data, end_time, updated_at) VALUES (?, ?, ?, ?)',
          ).bind(match.id, strippedJson, match.end_time, now),
        );
        pendingFanout.push(null);
        matchStateFanouts.push({ matchId: match.id, data: strippedData, json: strippedJson });
      }

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
            pendingFanout.push({
              matchId: match.id,
              type: 'capture',
              data: {
                matchId: match.id,
                objectiveId: obj.id,
                objectiveType: obj.type,
                mapType: map.type,
                owner: obj.owner,
                at: obj.last_flipped,
              },
            });
          }

          if (this.#shouldEmitClaim(obj, prev)) {
            newEventCount++;
            stmts.push(
              this.env.WVW_DB.prepare(
                'INSERT OR IGNORE INTO events (match_id, type, at, objective_id, objective_type, map_type, owner, claimed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              ).bind(match.id, 'claim', obj.claimed_at, obj.id, obj.type, map.type, obj.owner, obj.claimed_by),
            );
            pendingFanout.push({
              matchId: match.id,
              type: 'claim',
              data: {
                matchId: match.id,
                objectiveId: obj.id,
                objectiveType: obj.type,
                mapType: map.type,
                owner: obj.owner,
                claimedBy: obj.claimed_by,
                at: obj.claimed_at,
              },
            });
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
    const batchResults = stmts.length > 0 ? await this.env.WVW_DB.batch(stmts) : [];

    console.info(
      `[MatchupPoller] poll complete — ${matches.length} matches, ${newEventCount} new events, ${this.#subscribers.size} subscribers`,
    );

    // --- Update in-memory state after successful batch ---
    for (const matchId of resetMatchIds) {
      for (const key of this.#objectiveSnap.keys()) {
        if (key.startsWith(`${matchId}:`)) {
          this.#objectiveSnap.delete(key);
        }
      }
      this.#matchStateJson.delete(matchId);
    }

    for (const { matchId, endTime } of endTimeUpdates) {
      this.#matchEndTimes.set(matchId, endTime);
    }

    // Cache current match state JSON for change detection on next poll.
    // Done after successful batch so we don't cache a state that wasn't written.
    for (const { matchId, json } of matchStateFanouts) {
      this.#matchStateJson.set(matchId, json);
    }

    for (const { key, snap } of snapUpdates) {
      this.#objectiveSnap.set(key, snap);
    }

    // --- Fan out to SSE subscribers (skip entirely if no one is connected) ---
    if (this.#subscribers.size === 0) return;

    // 1. Reset events — client clears its local log for the affected match.
    for (const matchId of resetMatchIds) {
      const newEndTime = this.#matchEndTimes.get(matchId) ?? '';
      await this.#fanout(matchId, 'reset', { matchId, endTime: newEndTime }, `0:${newEndTime}`);
    }

    // 2. Match state — full snapshot pushed every poll so display stays current.
    //    No id: field — match-state events don't advance the Last-Event-ID cursor.
    for (const { matchId, data } of matchStateFanouts) {
      await this.#fanout(matchId, 'match-state', { matchId, data });
    }

    // 3. Capture / claim events — only rows that were actually inserted (changes > 0).
    //    INSERT OR IGNORE produces changes=0 for duplicates; we skip those.
    for (let i = 0; i < batchResults.length; i++) {
      const pending = pendingFanout[i];
      if (!pending) continue;
      const result = batchResults[i];
      if (!result) continue;
      if (result.meta.changes > 0 && result.meta.last_row_id > 0) {
        const endTime = this.#matchEndTimes.get(pending.matchId) ?? '';
        const id = `${result.meta.last_row_id}:${endTime}`;
        await this.#fanout(pending.matchId, pending.type, { ...pending.data, id: result.meta.last_row_id }, id);
      }
    }
  }

  async #fanout(matchId: string, event: string, data: unknown, id?: string): Promise<void> {
    const chunk = this.#sseChunk(event, data, id);

    const writes = [...this.#subscribers.entries()]
      .filter(([, sub]) => sub.matchId === matchId)
      .map(async ([subId, sub]) => {
        // desiredSize is null when the writer is already closed or errored.
        if (sub.writer.desiredSize === null) {
          console.warn(`[MatchupPoller] dropping subscriber ${subId} (${sub.matchId}): writer already closed`);
          return subId;
        }
        try {
          // Race the write against a timeout so a zombie subscriber (client gone
          // but no TCP FIN/RST) cannot stall the alarm handler indefinitely.
          await Promise.race([
            sub.writer.write(chunk),
            new Promise<never>((_, reject) =>
              setTimeout(() => {
                reject(new Error('SSE write timeout'));
              }, SSE_WRITE_TIMEOUT_MS),
            ),
          ]);
          return null;
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          console.warn(`[MatchupPoller] dropping subscriber ${subId} (${sub.matchId}): ${reason}`);
          return subId;
        }
      });

    const results = await Promise.allSettled(writes);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        this.#subscribers.delete(result.value);
      }
    }
  }

  #sseChunk(event: string, data: unknown, id?: string): Uint8Array {
    let msg = '';
    if (id) msg += `id: ${id}\n`;
    msg += `event: ${event}\n`;
    msg += `data: ${JSON.stringify(data)}\n\n`;
    return this.#encoder.encode(msg);
  }

  #eventRowToPayload(matchId: string, row: EventRow): Record<string, unknown> {
    const base: Record<string, unknown> = {
      id: row.id,
      matchId,
      objectiveId: row.objective_id,
      objectiveType: row.objective_type,
      mapType: row.map_type,
      owner: row.owner,
      at: row.at,
    };
    if (row.type === 'claim') {
      base.claimedBy = row.claimed_by;
    }
    return base;
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
