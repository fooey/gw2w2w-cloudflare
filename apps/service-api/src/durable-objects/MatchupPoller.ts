import type { CloudflareEnv } from '#index.ts';
import type { WvWMatch, WvWMatchObjective } from '#lib/resources/wvw/matches.ts';
import { isEmpty, isNil, isNonEmptyString, isPresent } from '@repo/utils';
import { DurableObject } from 'cloudflare:workers';
import { isEqual } from 'lodash-es';

const POLL_INTERVAL_MS = 20_000;
const BACKOFF_INTERVAL_MS = 60_000; // back off 1 minute on 429
// GW2 API rate limit parameters (observed from x-rate-limit-limit response header)
// Bucket: 600 requests, refill: ~5 req/s
const GW2_RATE_LIMIT_REFILL = '~5 req/s';
const GW2_MATCHES_PATH = '/v2/wvw/matches';
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

// Everything #poll needs to persist to D1 and then fan out, built by #buildPollPlan
// and threaded through #persistPollPlan / #applyPollPlan / #fanoutPollPlan.
interface PollPlan {
  stmts: D1PreparedStatement[];
  pendingFanout: (PendingFanout | null)[];
  matchStateFanouts: WvWMatch[];
  snapUpdates: { key: string; snap: ObjectiveSnap }[];
  resetMatchIds: string[];
  newEventsByMatch: Map<string, number>;
}

async function closeWriterIgnoringErrors(writer: WritableStreamDefaultWriter<Uint8Array>): Promise<void> {
  try {
    await writer.close();
  } catch {
    // already closed
  }
}

class RateLimitError extends Error {
  public retryAfterMs: number;
  public rateLimitBurst: number | null;
  public egressIp: string | null;
  public constructor(retryAfterMs: number, rateLimitBurst: number | null = null, egressIp: string | null = null) {
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
  #matchState: Map<string, WvWMatch> = new Map<string, WvWMatch>();
  #subscribers: Map<string, Subscriber> = new Map<string, Subscriber>();
  #encoder = new TextEncoder();

  // Observability counters — reset on cold start, exposed via /status.
  #consecutiveRateLimits = 0;
  #lastRateLimitAt: string | null = null;
  #lastSuccessfulPollAt: string | null = null;
  #consecutiveD1Errors = 0;
  #lastD1ErrorAt: string | null = null;
  #totalD1Writes = 0;

  public constructor(ctx: DurableObjectState, env: CloudflareEnv) {
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
      if (isNil(existing) || existing <= Date.now()) {
        await ctx.storage.setAlarm(Date.now() + POLL_INTERVAL_MS);
      }
    });
  }

  public override async alarm(): Promise<void> {
    const requestId = crypto.randomUUID();
    // Reschedule FIRST — before any work — so eviction after poll can't kill the loop.
    await this.ctx.storage.setAlarm(Date.now() + POLL_INTERVAL_MS);
    try {
      await this.#poll(requestId);
    } catch (err) {
      if (err instanceof RateLimitError) {
        this.#consecutiveRateLimits++;
        this.#lastRateLimitAt = new Date().toISOString();
        const resumeAt = new Date(Date.now() + err.retryAfterMs).toISOString();
        const burst = err.rateLimitBurst ?? 'unknown';
        const ipSuffix = isPresent(err.egressIp) ? `, egressIp=${err.egressIp}` : '';
        console.warn(
          `[MatchupPoller] [${requestId}] rate limited #${this.#consecutiveRateLimits} (burst=${burst}, refill=${GW2_RATE_LIMIT_REFILL}${ipSuffix})` +
            ` — backing off ${err.retryAfterMs}ms, resuming ~${resumeAt}`,
        );
        await this.ctx.storage.setAlarm(Date.now() + err.retryAfterMs);
      } else if (err instanceof DOMException && err.name === 'TimeoutError') {
        console.error(`[MatchupPoller] [${requestId}] alarm timed out — GW2 API fetch exceeded 10s deadline`);
      } else {
        console.error(`[MatchupPoller] [${requestId}] alarm error:`, err);
      }
    }
  }

  public override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/subscribe') {
      return this.#handleSubscribe(request);
    }

    if (url.pathname !== '/status') {
      return new Response('Not found', { status: 404 });
    }

    // Status endpoint
    const alarm = await this.ctx.storage.getAlarm();
    const subscribersByMatch: Record<string, number> = {};
    for (const { matchId } of this.#subscribers.values()) {
      subscribersByMatch[matchId] = (subscribersByMatch[matchId] ?? 0) + 1;
    }

    return Response.json({
      status: 'ok',
      nextAlarmAt: alarm,
      nextAlarmAtISO: isPresent(alarm) ? new Date(alarm).toISOString() : null,
      alarmIsStale: isPresent(alarm) && alarm <= Date.now(),
      matchCount: this.#matchEndTimes.size,
      matchEndTimes: Object.fromEntries(this.#matchEndTimes),
      cachedMatchStateKeys: [...this.#matchState.keys()],
      objectiveCount: this.#objectiveSnap.size,
      subscriberCount: this.#subscribers.size,
      subscribersByMatch,
      consecutiveRateLimits: this.#consecutiveRateLimits,
      lastRateLimitAt: this.#lastRateLimitAt,
      lastSuccessfulPollAt: this.#lastSuccessfulPollAt,
      consecutiveD1Errors: this.#consecutiveD1Errors,
      lastD1ErrorAt: this.#lastD1ErrorAt,
      totalD1Writes: this.#totalD1Writes,
    });
  }

  async #handleSubscribe(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const matchId = url.searchParams.get('matchId');

    if (isEmpty(matchId)) {
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
      void closeWriterIgnoringErrors(writer);
    });

    // IMPORTANT: seed AFTER returning the Response so the readable has a consumer.
    // Awaiting writer.write() before the Response is returned deadlocks when the
    // chunk size exceeds the TransformStream's internal buffer HWM — nothing is
    // reading the readable yet, so backpressure blocks the write indefinitely.
    this.ctx.waitUntil(
      (async () => {
        try {
          await this.#seedAndReplay(writer, matchId, matchRow, request.headers.get('last-event-id'));
        } catch (err: unknown) {
          console.error('[MatchupPoller] seed error:', err);
          this.#subscribers.delete(subId);
          void closeWriterIgnoringErrors(writer);
        }
      })(),
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

    if (isEmpty(lastEventId)) return;

    // Last-Event-ID format: "{d1RowId}:{matchEndTime}"
    // The matchEndTime embedded in the id lets us detect weekly resets without an
    // extra D1 query — if end_time has advanced, the stored event ids are stale.
    const colonIdx = lastEventId.indexOf(':');
    if (colonIdx < 1) return;

    // parseInt tolerates trailing garbage and doesn't auto-detect a leading "0x" as hex, unlike Number().
    // eslint-disable-next-line unicorn/prefer-number-coercion
    const lastId = Number.parseInt(lastEventId.slice(0, colonIdx), 10);
    const lastEndTime = lastEventId.slice(colonIdx + 1);

    if (Number.isNaN(lastId)) return;

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
      payload += `id: ${row.id}:${matchRow.end_time}\nevent: ${row.type}\ndata: ${JSON.stringify(MatchupPoller.#eventRowToPayload(matchId, row))}\n\n`;
    }
    await writer.write(this.#encoder.encode(payload));
  }

  async #fetchMatches(requestId: string, requestTime: Date): Promise<Response | null> {
    if (isEmpty(this.env.GW2_API_KEY)) {
      console.warn(`[MatchupPoller] [${requestId}] GW2_API_KEY not set — skipping poll`);
      return null;
    }

    const fetchUrl = new URL(GW2_MATCHES_PATH, this.env.GW2_API_BASE);

    const fetchParams = new URLSearchParams({
      ids: 'all',
      ts: requestTime.getTime().toString(),
      request_id: requestId,
    });
    fetchUrl.search = fetchParams.toString();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.env.GW2_API_KEY}`,
      'User-Agent': 'gw2w2w.com',
      'Cache-Control': 'no-cache',
      'X-Request-Id': requestId,
    };

    const response = await fetch(fetchUrl.toString(), {
      headers,
      cf: { cacheTtl: 0, cacheEverything: false },
      signal: AbortSignal.timeout(10_000),
    });
    console.info(`[MatchupPoller] [${requestId}] fetch ${fetchUrl.toString()}`);

    if (!response.ok) {
      if (response.status === 429) {
        await MatchupPoller.#handleRateLimit(response, requestId);
      }
      throw new Error(
        `[MatchupPoller] [${requestId}] GW2 API error: ${response.status.toString()} ${response.statusText}`,
      );
    }

    return response;
  }

  static async #handleRateLimit(response: Response, _requestId: string): Promise<never> {
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
      const trace = await fetch('https://1.1.1.1/cdn-cgi/trace', {
        signal: AbortSignal.timeout(200),
      });
      const text = await trace.text();
      egressIp = /^ip=(.+)$/mu.exec(text)?.[1] ?? null;
    } catch {
      // non-critical — don't let this suppress the RateLimitError
    }
    // console.info('[MatchupPoller] 429 headers:', JSON.stringify(rateLimitHeaders), 'egressIp:', egressIp);
    const retryAfter = response.headers.get('Retry-After');
    // parseInt tolerates trailing garbage and doesn't auto-detect a leading "0x" as hex, unlike Number().
    // eslint-disable-next-line unicorn/prefer-number-coercion
    const retryAfterMs = isPresent(retryAfter) ? Number.parseInt(retryAfter, 10) * 1_000 : BACKOFF_INTERVAL_MS;
    const rateLimitBurstRaw = response.headers.get('x-rate-limit-limit');
    // eslint-disable-next-line unicorn/prefer-number-coercion
    const rateLimitBurst = isPresent(rateLimitBurstRaw) ? Number.parseInt(rateLimitBurstRaw, 10) : null;
    throw new RateLimitError(
      Number.isFinite(retryAfterMs) ? retryAfterMs : BACKOFF_INTERVAL_MS,
      rateLimitBurst,
      egressIp,
    );
  }

  async #poll(requestId: string): Promise<void> {
    const requestStartTime = new Date();

    console.info(`[MatchupPoller] [${requestId}] poll started ${requestStartTime.toISOString()}`);
    const response = await this.#fetchMatches(requestId, requestStartTime);
    if (response === null) return;

    const matches = await response.json<WvWMatch[]>();

    // Reset consecutive counter on successful poll.
    if (this.#consecutiveRateLimits > 0) {
      console.info(`[MatchupPoller] [${requestId}] recovered after ${this.#consecutiveRateLimits} consecutive 429s`);
      this.#consecutiveRateLimits = 0;
    }

    this.#lastSuccessfulPollAt = requestStartTime.toISOString();

    const plan = this.#buildPollPlan(matches, requestId, requestStartTime);
    const newEventCount = [...plan.newEventsByMatch.values()].reduce((a, b) => a + b, 0);
    const batchResults = await this.#persistPollPlan(plan, requestId, requestStartTime);

    const eventSummary =
      plan.newEventsByMatch.size > 0
        ? ` (${[...plan.newEventsByMatch.entries()].map(([id, n]) => `${id}:${n}`).join(',')})`
        : '';
    console.info(
      `[MatchupPoller] [${requestId}] poll complete — ${matches.length} matches, ${newEventCount} new events${eventSummary}, ${this.#subscribers.size} subscribers`,
    );

    this.#applyPollPlan(matches, plan);
    await this.#fanoutPollPlan(plan, batchResults, requestId);

    const requestEndTime = new Date();
    const durationMs = requestEndTime.getTime() - requestStartTime.getTime();
    console.info(`[MatchupPoller] [${requestId}] duration=${durationMs}ms`);
  }

  // Diffs the freshly-fetched matches against cached state and builds every D1 statement
  // and in-memory update #poll needs to apply, without executing or persisting any of it.
  #buildPollPlan(matches: WvWMatch[], requestId: string, requestStartTime: Date): PollPlan {
    // pendingFanout is a parallel array to stmts — null for non-event statements so we can
    // correlate batch results (meta.changes / last_row_id) back to their fanout data.
    const stmts: D1PreparedStatement[] = [];
    const pendingFanout: (PendingFanout | null)[] = [];
    const matchStateFanouts: WvWMatch[] = [];
    const snapUpdates: { key: string; snap: ObjectiveSnap }[] = [];
    const resetMatchIds: string[] = [];
    const newEventsByMatch = new Map<string, number>();

    for (const match of matches) {
      // --- Reset detection ---
      // NA (1-x) resets Friday ~02:00 UTC; EU (2-x) resets Saturday ~01:00 UTC.
      // Each match is checked independently — they reset at different times and
      // the single global DO handles all 9 matches in one alarm loop.
      // Detection via end_time string equality is robust against ArenaNet delays
      // and avoids hardcoding day/time logic.
      const prevEndTime = this.#matchEndTimes.get(match.id);
      if (isPresent(prevEndTime) && prevEndTime !== match.end_time) {
        console.info(`[MatchupPoller] [${requestId}] Weekly reset detected for match ${match.id}`);
        resetMatchIds.push(match.id);
        stmts.push(this.env.WVW_DB.prepare('DELETE FROM events WHERE match_id = ?').bind(match.id));
        pendingFanout.push(null);
      }

      // --- Match state upsert (only when changed) ---
      const prevMatchState = this.#matchState.get(match.id);
      const matchStateChanged = !isEqual(prevMatchState, match);

      if (matchStateChanged) {
        stmts.push(
          this.env.WVW_DB.prepare(
            'INSERT OR REPLACE INTO match_state (match_id, data, end_time, updated_at) VALUES (?, ?, ?, ?)',
          ).bind(match.id, JSON.stringify(match), match.end_time, requestStartTime.toISOString()),
        );
        pendingFanout.push(null);
        matchStateFanouts.push(match);
      }

      // --- Objective diff ---
      for (const map of match.maps) {
        for (const obj of map.objectives) {
          const snapKey = `${match.id}:${obj.id}`;
          const prev = this.#objectiveSnap.get(snapKey);

          if (MatchupPoller.#shouldEmitCapture(obj, prev)) {
            newEventsByMatch.set(match.id, (newEventsByMatch.get(match.id) ?? 0) + 1);
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

          if (MatchupPoller.#shouldEmitClaim(obj, prev)) {
            newEventsByMatch.set(match.id, (newEventsByMatch.get(match.id) ?? 0) + 1);
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

    return { stmts, pendingFanout, matchStateFanouts, snapUpdates, resetMatchIds, newEventsByMatch };
  }

  // Executes the plan's D1 statements as a single atomic batch. Returns [] without writing
  // anything if there's nothing to persist. Re-throws on failure so #poll's caller (alarm())
  // sees the error and #applyPollPlan / #fanoutPollPlan never run against an unpersisted plan.
  async #persistPollPlan(plan: PollPlan, requestId: string, requestStartTime: Date): Promise<D1Result[]> {
    if (plan.stmts.length === 0) return [];

    const upsertedMatchIds = plan.matchStateFanouts.map((m) => m.id);
    const stmtSummary =
      `resets=[${plan.resetMatchIds.join(',')}]` +
      ` upserts=[${upsertedMatchIds.join(',')}]` +
      ` events={${[...plan.newEventsByMatch.entries()].map(([id, n]) => `${id}:${n}`).join(',')}}`;
    console.info(`[MatchupPoller] [${requestId}] D1 batch: ${plan.stmts.length} statements — ${stmtSummary}`);
    try {
      const batchResults = await this.env.WVW_DB.batch(plan.stmts);
      this.#totalD1Writes += plan.stmts.length;
      if (this.#consecutiveD1Errors > 0) {
        console.info(
          `[MatchupPoller] [${requestId}] D1 recovered after ${this.#consecutiveD1Errors} consecutive errors`,
        );
        this.#consecutiveD1Errors = 0;
      }
      return batchResults;
    } catch (err) {
      this.#consecutiveD1Errors++;
      this.#lastD1ErrorAt = requestStartTime.toISOString();
      console.error(
        `[MatchupPoller] [${requestId}] D1 batch failed (consecutive=${this.#consecutiveD1Errors}, stmts=${plan.stmts.length}, ${stmtSummary}):`,
        err,
      );
      // Re-throw so in-memory state is not updated and the next poll retries.
      throw err;
    }
  }

  // Updates in-memory caches to match what was just persisted. Must only be called after
  // #persistPollPlan resolves successfully — never against a plan that failed to write.
  #applyPollPlan(matches: WvWMatch[], plan: PollPlan): void {
    for (const matchId of plan.resetMatchIds) {
      for (const key of this.#objectiveSnap.keys()) {
        if (key.startsWith(`${matchId}:`)) {
          this.#objectiveSnap.delete(key);
        }
      }
      this.#matchState.delete(matchId);
    }

    // Cache current match end times and state for change detection on next poll.
    // Done after successful batch so we don't cache a state that wasn't written.
    for (const match of matches) {
      this.#matchEndTimes.set(match.id, match.end_time);
      this.#matchState.set(match.id, match);
    }

    for (const { key, snap } of plan.snapUpdates) {
      this.#objectiveSnap.set(key, snap);
    }
  }

  // Fans the plan's results out to connected SSE subscribers (skip entirely if no one is connected).
  async #fanoutPollPlan(plan: PollPlan, batchResults: D1Result[], requestId: string): Promise<void> {
    if (this.#subscribers.size === 0) return;

    // 1. Reset events — client clears its local log for the affected match.
    //    Each matchId appears at most once here, so these fan out independently in parallel.
    await Promise.all(
      plan.resetMatchIds.map(async (matchId) => {
        const newEndTime = this.#matchEndTimes.get(matchId) ?? '';
        return this.#fanout(matchId, 'reset', { matchId, endTime: newEndTime }, `0:${newEndTime}`, requestId);
      }),
    );

    // 2. Match state — full snapshot pushed every poll so display stays current.
    //    No id: field — match-state events don't advance the Last-Event-ID cursor.
    //    Each match appears at most once here, so these fan out independently in parallel.
    await Promise.all(
      plan.matchStateFanouts.map(async (match) =>
        this.#fanout(match.id, 'match-state', { matchId: match.id, data: match }, undefined, requestId),
      ),
    );

    // 3. Capture / claim events — only rows that were actually inserted (changes > 0).
    //    INSERT OR IGNORE produces changes=0 for duplicates; we skip those.
    for (let i = 0; i < batchResults.length; i++) {
      const pending = plan.pendingFanout[i];
      if (!pending) continue;
      const result = batchResults[i];
      if (!result) continue;
      if (result.meta.changes > 0 && result.meta.last_row_id > 0) {
        const endTime = this.#matchEndTimes.get(pending.matchId) ?? '';
        const id = `${result.meta.last_row_id}:${endTime}`;
        // A single match can have multiple pending events in one poll (e.g. several
        // objectives flipping at once); parallelizing this would let their SSE writes
        // land out of order and desync the client's Last-Event-ID cursor for that match.
        // eslint-disable-next-line no-await-in-loop
        await this.#fanout(
          pending.matchId,
          pending.type,
          { ...pending.data, id: result.meta.last_row_id },
          id,
          requestId,
        );
      }
    }
  }

  async #fanout(matchId: string, event: string, data: unknown, id?: string, requestId?: string): Promise<void> {
    const chunk = this.#sseChunk(event, data, id);
    const pfx = isPresent(requestId) ? `[MatchupPoller] [${requestId}]` : '[MatchupPoller]';

    const writes = [...this.#subscribers.entries()]
      .filter(([, sub]) => sub.matchId === matchId)
      .map(async ([subId, sub]) => {
        // desiredSize is null when the writer is already closed or errored.
        if (sub.writer.desiredSize === null) {
          console.warn(`${pfx} dropping subscriber ${subId} (${sub.matchId}): writer already closed`);
          return subId;
        }
        try {
          // Race the write against a timeout so a zombie subscriber (client gone
          // but no TCP FIN/RST) cannot stall the alarm handler indefinitely.
          await Promise.race([
            sub.writer.write(chunk),
            new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error('SSE write timeout'));
              }, SSE_WRITE_TIMEOUT_MS);
            }),
          ]);
          return null;
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          console.warn(`${pfx} dropping subscriber ${subId} (${sub.matchId}): ${reason}`);
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
    if (isNonEmptyString(id)) msg += `id: ${id}\n`;
    msg += `event: ${event}\n`;
    msg += `data: ${JSON.stringify(data)}\n\n`;
    return this.#encoder.encode(msg);
  }

  static #eventRowToPayload(matchId: string, row: EventRow): Record<string, unknown> {
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
      // Restore the JSON cache so the first post-cold-start poll skips redundant
      // match_state upserts for matches that haven't changed since the last write.
      // row.data was JSON.stringify(match)'d by this same class — trusted, not external input.
      // eslint-disable-next-line typescript/no-unsafe-type-assertion
      const match = JSON.parse(row.data) as WvWMatch;
      this.#matchState.set(row.match_id, match);
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

  static #shouldEmitCapture(obj: WvWMatchObjective, prev: ObjectiveSnap | undefined): boolean {
    if (isNil(obj.last_flipped)) return false;
    return obj.last_flipped !== prev?.last_flipped;
  }

  static #shouldEmitClaim(obj: WvWMatchObjective, prev: ObjectiveSnap | undefined): boolean {
    return isPresent(obj.claimed_at) && isPresent(obj.claimed_by) && obj.claimed_at !== prev?.claimed_at;
  }
}
