# V2: Real-Time WvW Event Tracking

A planned major evolution of the WvW tools — server-driven event tracking with persistent history, real-time push notifications, and an SSE delivery model that eliminates client-side polling entirely.

---

## Goals

- Detect WvW objective captures and claims **server-side**, as close to real-time as the GW2 API allows
- Persist a full event log for the current match week, wiped on weekly reset
- Push full match state and events to connected clients via **SSE**, replacing all client-side polling
- Seed the client event log from D1 on page load and reconnect — clients never call the GW2 API directly
- Deliver **browser notifications** for important events (capture of watched objectives, activity by watched guilds)
- Expose guild activity aggregates queryable by guild ID

---

## Architecture Overview

```
GW2 API (/v2/wvw/matches?ids=all)
   ↓ every ~6s (ETag-gated — 304 = skip all work)
MatchupPoller DO  ← single global instance
   ├── always (on ETag change):
   │   ├── INSERT OR REPLACE match_state → D1 (stripped blob + end_time)
   │   └── push match-state SSE → connected clients (scores, kills/deaths, objectives, bonuses, worlds)
   ├── only when objective snapshot differs (scoped diff, not full JSON):
   │   ├── INSERT OR IGNORE new events → D1 (captures / claims)
   │   └── push capture / claim SSE → subscribed clients
   ├── on end_time advance (weekly reset):
   │   ├── DELETE events
   │   └── push reset SSE → all clients
   ├── reschedule alarm → self (next poll)
   └── (cold start) read match_state from D1 → rebuild in-memory objective snapshot
         ↑
      Browser clients
         ├── on connect: Worker queries D1 for current match state + recent events
         ├── live updates: SSE push (match-state, capture, claim, reset event types)
         └── on reconnect: Last-Event-ID → replay missed events from D1 (if no reset)
```

### Key Insight: The DO Is the Differ

The DO keeps the previous poll's full matchup snapshot **in memory** between alarms. Diffing is pure in-memory comparison — no storage reads on the hot path. D1 is only written when something actually changed, and only read for:

1. Seeding new SSE clients on connect
2. Cold-start recovery if the DO is evicted (rebuilds in-memory state before next poll)

This collapses what is currently N independent client polls + N independent diffs into a single server-side operation regardless of how many clients are connected.

---

## Polling Strategy

### Durable Object Alarms (not Cron Triggers)

Cron Triggers have a 1-minute minimum interval. DO alarms support arbitrary sub-minute scheduling and are a first-class, documented Cloudflare feature — not a workaround. The alarm handler reschedules itself at the end of each invocation.

Interval: **6 seconds** (fixed).

### Single Fetch for All 9 Matchups

`GET /v2/wvw/matches?ids=all` returns all active matchups in one request. One GW2 API call per poll cycle regardless of matchup count.

### ETag / Conditional Requests

The GW2 API returns `ETag` headers. On each alarm, send `If-None-Match` with the previous ETag. A `304 Not Modified` response means nothing changed — skip all work, reschedule and sleep.

Store the last ETag in DO memory (and D1 for cold-start recovery alongside match state).

### Scoped Diffing: Objectives Only

The full match payload includes kills, deaths, and skirmish tick scores, which update frequently and cause ETag changes independently of any objective state change. Running the full event diff on every ETag change wastes compute and risks spurious D1 writes.

The alarm handler separates two concerns:

1. **Match state** — on every ETag change, store a stripped blob in D1 and push a `match-state` SSE event. The stored blob omits `skirmishes` (per-skirmish tick history). Clients receive:
   - `scores` — cumulative war score per team
   - `victory_points` — PPT tally
   - `kills` / `deaths` — full-week totals per team
   - `maps[].scores` / `maps[].kills` / `maps[].deaths` — per-map breakdowns
   - `maps[].objectives[]` — full objective state (owner, last_flipped, claimed_by, claimed_at, yaks_delivered, guild_upgrades)
   - `maps[].bonuses` — active map bonuses (e.g. Bloodlust)
   - `worlds` / `all_worlds` — team composition
   - `start_time` / `end_time` — for reset countdown and detection

   Skirmishes are intentionally excluded — per-tick history is high-volume data with limited display value at this stage.

2. **Event diff** — extract only the fields that drive events from each `maps[].objectives[]` entry and compare against the in-memory objective snapshot:
   - `last_flipped` → capture detection
   - `claimed_by` + `claimed_at` → claim detection
   - `owner` → included in event payload

   Only when the objective snapshot differs does the DO insert into `events` and fan out capture/claim SSE events.

A score/kill tick (ETag changes, no objective change) results in a `match-state` push with no event work. An objective flip results in both a `match-state` push and event inserts/fanout.

### Latency Floor

ArenaNet does not publish their WvW API refresh rate. Based on observation it appears to be approximately **30 seconds**. Polling at 6s detects changes as soon as ArenaNet publishes them, but the unavoidable floor is their backend cadence. Surface this in the UI ("events may reflect up to ~30s delay").

---

## Storage: D1

### Why D1

- Full SQL — query by matchId, objectiveId, guild, time window
- Append-only event writes, blob upserts for match state — simple access patterns
- Seeding new clients is a bounded indexed read; guild activity is computed on demand via indexed GROUP BY
- Free tier at this workload: ~50K event rows/week, 9 match state rows → nowhere near the 50M row write/month included limit

### Schema

```sql
-- Current match state — 9 rows, one per active matchup (IDs are permanent: 1-1..1-4, 2-1..2-5)
-- Upserted when ETag changes, used to seed new SSE clients without a GW2 API call.
-- end_time is stored as a top-level column for cheap reset detection (string equality vs blob parse).
-- data is WvWMatch with skirmishes[] stripped — skirmish history is excluded from the V2 scope.
CREATE TABLE match_state (
  match_id   TEXT PRIMARY KEY,
  data       TEXT NOT NULL,    -- WvWMatchStripped JSON blob (WvWMatch minus skirmishes[])
  end_time   TEXT NOT NULL,    -- from WvWMatch.end_time; advances on weekly reset
  etag       TEXT,
  updated_at TEXT NOT NULL
);

-- Append-only event log for the current match week
-- UNIQUE constraint silently deduplicates on cold-start recovery via INSERT OR IGNORE
CREATE TABLE events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id       TEXT NOT NULL,
  type           TEXT NOT NULL,    -- 'capture' | 'claim'
  at             TEXT NOT NULL,    -- ISO 8601 timestamp from GW2 API (last_flipped or claimed_at)
  objective_id   TEXT NOT NULL,
  objective_type TEXT NOT NULL,
  map_type       TEXT NOT NULL,
  owner          TEXT NOT NULL,
  claimed_by     TEXT,             -- guild ID, null for capture events
  UNIQUE (match_id, objective_id, type, at)
);

-- idx_events_match: cursor-based event feed per match (seeding, replay)
CREATE INDEX idx_events_match ON events (match_id, id DESC);

-- idx_events_guild: guild event feed + per-guild claim aggregation
CREATE INDEX idx_events_guild ON events (claimed_by, match_id, type, id DESC);

-- idx_events_claims: full-match claim leaderboard across all guilds
CREATE INDEX idx_events_claims ON events (match_id, type, claimed_by);
```

### Deduplication: INSERT OR IGNORE

The `UNIQUE (match_id, objective_id, type, at)` constraint handles the cold-start case where the DO restarts without in-memory state and the first poll regenerates events already in D1:

```sql
INSERT OR IGNORE INTO events (match_id, type, at, objective_id, objective_type, map_type, owner, claimed_by)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
```

No read-before-write needed. SQLite silently drops duplicates and does not consume autoincrement IDs on conflict, keeping the `id` sequence clean for use as SSE cursor.

The `at` value is always the **GW2 API timestamp** (`last_flipped` / `claimed_at`), never insertion time — this is what makes the key stable across restarts.

### Guild Activity Query

Guild activity aggregates are computed on demand via a single indexed GROUP BY against `events`. No separate aggregate table is maintained — the events table is bounded to the current match week (~50K rows max) and the guild index makes per-guild scans fast.

```sql
-- Per-guild activity for a specific match (used by guild activity endpoint)
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
  MAX(at)                                                           AS last_seen_at
FROM events
WHERE claimed_by = ? AND match_id = ? AND type = 'claim'
GROUP BY claimed_by, match_id;

-- Full-match guild leaderboard (all guilds active in a match)
SELECT
  claimed_by AS guild_id,
  COUNT(*)   AS total
FROM events
WHERE match_id = ? AND type = 'claim'
GROUP BY claimed_by
ORDER BY total DESC;
```

Both queries use `idx_events_guild` and `idx_events_claims` respectively, scanning only claim rows for the relevant match.

### Match State Upsert

```sql
INSERT OR REPLACE INTO match_state (match_id, data, etag, updated_at)
VALUES (?, ?, ?, ?)
```

9 rows. Always a full JSON blob replacement — no partial patching. Reads are always by primary key.

### Weekly Reset / Wipe

Match IDs are permanent and never change (`1-1` through `1-4` for NA, `2-1` through `2-5` for EU). Reset is detected by comparing the `end_time` (or `start_time`) from the current API response against the value stored in `match_state`. When it advances, a new match week has started. This is more robust than hardcoding Friday/Saturday UTC times since ArenaNet occasionally delays resets.

On reset:

1. `DELETE FROM events`
2. `INSERT OR REPLACE` new match state rows

### Lazy Loading for Clients

On SSE connect, don't dump the full week's event history. Seed with a bounded recent window:

```sql
SELECT * FROM events WHERE match_id = ? ORDER BY id DESC LIMIT 100
```

Clients can paginate backward on demand via the REST event log endpoint, which supports the full filter set (mapType, objectiveType, eventType, owner, since) and returns pages in cursor order. Client-side filter state drives API params rather than filtering an in-memory array.

---

## Client Delivery: SSE

Server-Sent Events over HTTP. Chosen over WebSockets because delivery is strictly server → client — clients never send event data back up the stream.

**Browser advantages:**

- Native auto-reconnect with `Last-Event-ID` sent automatically
- No upgrade handshake
- Works naturally with `ReadableStream` in Workers and Next.js Route Handlers

### SSE Event Types

```
event: match-state
data: { matchId, data: WvWMatchStripped }  -- WvWMatch minus skirmishes[]

event: capture
data: { id, matchId, objectiveId, objectiveType, mapType, owner, at }

event: claim
data: { id, matchId, objectiveId, objectiveType, mapType, owner, claimedBy, at }

event: reset
data: { matchId, endTime }
```

`WvWMatchStripped` is the full `WvWMatch` shape minus `skirmishes[]`. The DO strips this field before writing to D1 and before fanning out to SSE clients.

The `id:` field on each SSE event maps to the D1 autoincrement row id, used as the `Last-Event-ID` cursor for resumability.

**Note on autoincrement safety:** The DO is the sole writer to D1 and is single-threaded — there is no concurrent write contention, so SQLite's autoincrement sequence is reliable. UUIDs are not needed.

### Resumability

On reconnect, the browser sends `Last-Event-ID` automatically. The Worker first checks whether the stored `end_time` for the match has changed since the client's last connection — if it has, a reset occurred and the `Last-Event-ID` is stale (the autoincrement sequence restarted after the wipe). In that case, skip replay and send a fresh seed instead.

If no reset has occurred, replay missed events from D1:

```sql
SELECT * FROM events WHERE match_id = ? AND id > ? ORDER BY id ASC
```

Replays missed events before handing off to the live DO stream. Clients never miss a notification even through brief disconnects.

### Client Subscriptions

Clients scope their feed via query params:

```
/api/wvw/stream?matchId=2-5
/api/wvw/stream?matchId=2-5&guild=AAAA-BBBB-CCCC-DDDD
```

The DO filters fanout so clients only receive events relevant to their subscription.

---

## REST API: Event Log & Guild Activity

These endpoints serve historical browsing, sorting, and arbitrary filter combinations that SSE cannot provide. They query D1 directly — no GW2 API call involved.

### Event Log

```
GET /wvw/events?matchId=&limit=&before=&mapType=&objectiveType=&eventType=&owner=&since=
```

| Param | Values | Notes |
| --- | --- | --- |
| `matchId` | `1-1`…`2-5` | Required |
| `limit` | 1–100 | Default 50 |
| `before` | event `id` | Cursor — return rows with `id < before` |
| `mapType` | `Center` \| `RedHome` \| `BlueHome` \| `GreenHome` | Repeatable |
| `objectiveType` | `Camp` \| `Tower` \| `Keep` \| `Castle` \| `Ruins` | Repeatable |
| `eventType` | `capture` \| `claim` | Repeatable |
| `owner` | `Red` \| `Blue` \| `Green` \| `Neutral` | Repeatable |
| `since` | ISO 8601 timestamp | Lower bound on `at` |

Response: `{ events: EventRow[], nextCursor: number | null }`

`nextCursor` is the `id` of the last returned row — pass as `before` on the next request. `null` means no more rows. The client uses `useInfiniteQuery` to accumulate pages for infinite scroll.

### Guild Activity

```
GET /wvw/guilds?matchId=&limit=&page=&sort=&order=&objectiveType=&mapType=
```

| Param | Values | Notes |
| --- | --- | --- |
| `matchId` | `1-1`…`2-5` | Required |
| `limit` | 1–100 | Default 50 |
| `page` | integer ≥ 0 | Offset pagination — required for arbitrary sort |
| `sort` | `total` \| `last_seen_at` \| `claims_castle` \| `claims_keep` \| `claims_tower` \| `claims_camp` \| `claims_center` \| `claims_green_home` \| `claims_blue_home` \| `claims_red_home` | Default `total` |
| `order` | `asc` \| `desc` | Default `desc` |
| `objectiveType` | `Camp` \| `Tower` \| `Keep` \| `Castle` | Repeatable filter |
| `mapType` | `Center` \| `RedHome` \| `BlueHome` \| `GreenHome` | Repeatable filter |

Response: `{ guilds: GuildActivityRow[], total: number, page: number, pages: number }`

Offset pagination (not cursor) because arbitrary column sorting requires random-access paging — cursor pagination doesn't compose cleanly with `ORDER BY` on computed aggregate columns. The response is the existing GROUP BY query with optional `HAVING` filters and `ORDER BY` driven by params.

---

## Client Changes

The following are **removed** in V2 — clients no longer interact with the GW2 API directly:

- `useMatch` / `fetchWvwMatchDirect` / `refetchInterval` — replaced by SSE `match-state` events
- `useObjectiveTracker` diff logic — moves entirely server-side into the DO
- Client-side `objectiveLog` store seeding on first run — replaced by D1-seeded history on connect

New client responsibilities:

- Open `EventSource` and handle `match-state`, `capture`, `claim` event types
- Append incoming events to the local log (deduplication by event `id`)
- Infinite scroll event log — Zustand filter state drives REST API query params via `useInfiniteQuery`; replaces client-side in-memory filter over `objectiveLog`
- Guild activity table — fetched from REST API via `useQuery`; server-side sorting, filtering, and offset pagination replaces client-side aggregate over `objectiveLog`

---

## Cost Estimate (Workers Paid, $5/mo)

| Resource             | Monthly usage                         | Included         | Extra  |
| -------------------- | ------------------------------------- | ---------------- | ------ |
| DO alarm requests    | ~432K (10/min × 60 × 24 × 30)         | 1M               | $0     |
| DO duration (alarm)  | ~54K GB-s (alarm processing ~1s each) | 400K GB-s        | $0     |
| DO duration (SSE)    | negligible with hibernation API       | —                | $0     |
| SSE connections      | 1 DO request per connect              | within DO budget | $0     |
| D1 rows written      | ~200K events + 9 state upserts/poll   | 50M              | $0     |
| D1 rows read         | seed on connect, guild lookups        | 25B              | $0     |
| D1 storage           | ~10 MB/week, wiped weekly             | 5 GB             | $0     |
| **Total additional** |                                       |                  | **$0** |

---

## Implementation Order

1. **MatchupPoller DO** — alarm loop, GW2 fetch (`ids=all`), ETag support, in-memory diff
2. **D1 schema** — create tables and indexes, migration setup in `service-api`
3. **D1 writes** — event inserts (`INSERT OR IGNORE`), match state upserts
4. **Cold-start recovery** — DO constructor reads D1 match state to rebuild in-memory snapshot
5. **SSE endpoint** — Worker route that serves current state from D1 then streams from DO
6. **`Last-Event-ID` replay** — missed event catch-up on reconnect
7. **Reset detection** — `end_time` advance detection, `DELETE FROM events`, reset SSE event
8. **Client SSE integration** — `useMatchSSE`, seed log from SSE on connect, remove `useObjectiveTracker`
9. **Subscription filtering** — matchId and guild scoping on the SSE endpoint
10. **REST event log endpoint** — cursor pagination + server-side filtering (mapType, objectiveType, eventType, owner, since)
11. **REST guild activity endpoint** — offset pagination, server-side sort by any column, objectiveType and mapType filters
12. **Infinite scroll event log (client)** — Zustand filter state drives REST API params; `useInfiniteQuery` replaces in-memory filter over `objectiveLog`
13. **Guild activity paging (client)** — `useQuery` replaces client-side aggregate; sort/filter via query params

---

## Related Existing Code

| File                                             | Current role                                     | V2 fate                                              |
| ------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------- |
| `apps/gw2w2w/src/lib/wvw/useMatch.ts`            | Polls GW2 API via `useQuery` + `refetchInterval` | Replaced by `EventSource` hook                       |
| `apps/gw2w2w/src/lib/wvw/useObjectiveTracker.ts` | Client-side diff + event detection               | Logic moves server-side into DO; file removed        |
| `apps/gw2w2w/src/lib/store/objectiveLog.ts`      | Ephemeral in-memory event log                    | Backed by D1; seeded on connect; paginated via REST  |
| `apps/gw2w2w/src/lib/store/logFilters.ts`        | Client-side filter state (persisted)             | Unchanged — filter state now drives REST API params  |
| `apps/gw2w2w/src/ui/wvw/matchup/GuildActivity.tsx` | Client-side aggregate from `objectiveLog`      | API-backed; sort/filter/page via REST guild endpoint |
| `apps/gw2w2w/src/lib/api/gw2/`                   | Direct GW2 API client                            | No longer called from client                         |
| `apps/service-api/`                              | REST proxy to GW2 API                            | MatchupPoller DO, SSE + REST endpoints, D1 bindings  |
