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
   ↓ every ~6s (ETag-gated)
MatchupPoller DO  ← single global instance
   ├── in-memory: previous matchup snapshot (diff runs entirely in memory, no storage reads)
   ├── diff → detect captures and claims
   ├── INSERT OR IGNORE new events → D1 (persistent log)
   ├── INSERT OR REPLACE match_state → D1 (current match blob)
   ├── UPDATE guild_activity → D1 (incremental aggregates)
   ├── reschedule alarm → self (next poll)
   └── fan out → connected SSE clients (filtered per subscription)
         ↑
      Browser clients
         ├── on connect: Worker queries D1 for current match state + recent events
         ├── live updates: SSE push (match-state and event types)
         └── on reconnect: Last-Event-ID → replay missed events from D1
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

Target interval: **~6 seconds**.

### Single Fetch for All 9 Matchups

`GET /v2/wvw/matches?ids=all` returns all active matchups in one request. One GW2 API call per poll cycle regardless of matchup count.

### ETag / Conditional Requests

The GW2 API returns `ETag` headers. On each alarm, send `If-None-Match` with the previous ETag. A `304 Not Modified` response means nothing changed — skip diffing, skip all D1 writes, reschedule and sleep. Eliminates wasted compute and write ops during quiet periods.

Store the last ETag in DO memory (and D1 for cold-start recovery alongside match state).

### Latency Floor

ArenaNet does not publish their WvW API refresh rate. Based on observation it appears to be approximately **30 seconds**. Polling at 6s detects changes as soon as ArenaNet publishes them, but the unavoidable floor is their backend cadence. Surface this in the UI ("events may reflect up to ~30s delay").

---

## Storage: D1

### Why D1

- Full SQL — query by matchId, objectiveId, guild, time window
- Append-only event writes, blob upserts for match state — simple access patterns
- Seeding new clients and guild activity lookups are O(1) or bounded indexed reads
- Free tier at this workload: ~50K event rows/week, 9 match state rows → nowhere near the 50M row write/month included limit

### Schema

```sql
-- Current match state — 9 rows, one per active matchup (IDs are permanent: 1-1..1-4, 2-1..2-5)
-- Upserted when ETag changes, used to seed new SSE clients without a GW2 API call.
-- end_time is stored as a top-level column for cheap reset detection (string equality vs blob parse).
CREATE TABLE match_state (
  match_id   TEXT PRIMARY KEY,
  data       TEXT NOT NULL,    -- full WvWMatch JSON blob
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

CREATE INDEX idx_events_match ON events (match_id, id DESC);
CREATE INDEX idx_events_guild ON events (claimed_by, id DESC);

-- Incremental guild activity aggregates — updated on each claim event insert.
-- Shaped to match the GuildStats interface consumed by GuildActivity.tsx.
-- Enables O(1) guild lookups without scanning the events table.
CREATE TABLE guild_activity (
  guild_id              TEXT NOT NULL,
  match_id              TEXT NOT NULL,
  -- claim counts by objective type (mirrors ACTIVITY_OBJ_TYPES: Castle / Keep / Tower / Camp)
  claims_castle         INTEGER NOT NULL DEFAULT 0,
  claims_keep           INTEGER NOT NULL DEFAULT 0,
  claims_tower          INTEGER NOT NULL DEFAULT 0,
  claims_camp           INTEGER NOT NULL DEFAULT 0,
  -- claim counts by map (mirrors ACTIVITY_MAP_TYPES: Center / GreenHome / BlueHome / RedHome)
  claims_center         INTEGER NOT NULL DEFAULT 0,
  claims_green_home     INTEGER NOT NULL DEFAULT 0,
  claims_blue_home      INTEGER NOT NULL DEFAULT 0,
  claims_red_home       INTEGER NOT NULL DEFAULT 0,
  -- total claims
  total                 INTEGER NOT NULL DEFAULT 0,
  -- most recent claim metadata (for lastActivity / lastActivityMap / lastActivityOwner)
  last_seen_at          TEXT NOT NULL,
  last_seen_map         TEXT NOT NULL,
  last_seen_owner       TEXT NOT NULL,
  PRIMARY KEY (guild_id, match_id)
);
```

### Deduplication: INSERT OR IGNORE

The `UNIQUE (match_id, objective_id, type, at)` constraint handles the cold-start case where the DO restarts without in-memory state and the first poll regenerates events already in D1:

```sql
INSERT OR IGNORE INTO events (match_id, type, at, objective_id, objective_type, map_type, owner, claimed_by)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
```

No read-before-write needed. SQLite silently drops duplicates and does not consume autoincrement IDs on conflict, keeping the `id` sequence clean for use as SSE cursor.

The `at` value is always the **GW2 API timestamp** (`last_flipped` / `claimed_at`), never insertion time — this is what makes the key stable across restarts.

### Guild Activity Upsert

On each new claim event, increment the relevant counters atomically using `INSERT ... ON CONFLICT DO UPDATE` (SQLite `UPSERT`). This avoids a read-modify-write cycle:

```sql
INSERT INTO guild_activity (
  guild_id, match_id,
  claims_castle, claims_keep, claims_tower, claims_camp,
  claims_center, claims_green_home, claims_blue_home, claims_red_home,
  total, last_seen_at, last_seen_map, last_seen_owner
) VALUES (
  ?1, ?2,
  ?3, ?4, ?5, ?6,   -- 1 for the matching objective type, 0 for others
  ?7, ?8, ?9, ?10,  -- 1 for the matching map, 0 for others
  1, ?11, ?12, ?13
)
ON CONFLICT (guild_id, match_id) DO UPDATE SET
  claims_castle     = claims_castle     + excluded.claims_castle,
  claims_keep       = claims_keep       + excluded.claims_keep,
  claims_tower      = claims_tower      + excluded.claims_tower,
  claims_camp       = claims_camp       + excluded.claims_camp,
  claims_center     = claims_center     + excluded.claims_center,
  claims_green_home = claims_green_home + excluded.claims_green_home,
  claims_blue_home  = claims_blue_home  + excluded.claims_blue_home,
  claims_red_home   = claims_red_home   + excluded.claims_red_home,
  total             = total             + 1,
  last_seen_at      = excluded.last_seen_at,
  last_seen_map     = excluded.last_seen_map,
  last_seen_owner   = excluded.last_seen_owner
WHERE excluded.last_seen_at > guild_activity.last_seen_at;
```

Only triggered on `claim` events (not captures) since `GuildStats` is claim-only. The `WHERE` clause on the conflict update ensures `last_seen_*` fields only advance forward in time.

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
2. `DELETE FROM guild_activity`
3. `INSERT OR REPLACE` new match state rows

### Lazy Loading for Clients

On SSE connect, don't dump the full week's event history. Seed with a bounded recent window:

```sql
SELECT * FROM events WHERE match_id = ? ORDER BY id DESC LIMIT 100
```

Clients can paginate backward on demand (`WHERE id < ? LIMIT 100`).

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
data: { matchId, data: WvWMatch }

event: capture
data: { id, matchId, objectiveId, objectiveType, mapType, owner, at }

event: claim
data: { id, matchId, objectiveId, objectiveType, mapType, owner, claimedBy, at }

event: reset
data: { matchId, endTime }
```

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

## Client Changes

The following are **removed** in V2 — clients no longer interact with the GW2 API directly:

- `useMatch` / `fetchWvwMatchDirect` / `refetchInterval` — replaced by SSE `match-state` events
- `useObjectiveTracker` diff logic — moves entirely server-side into the DO
- Client-side `objectiveLog` store seeding on first run — replaced by D1-seeded history on connect

New client responsibilities:

- Open `EventSource` and handle `match-state`, `capture`, `claim` event types
- Append incoming events to the local log (deduplication by event `id`)
- Page Visibility API check to route events to in-app toast vs browser notification

---

## Browser Notifications

```
SSE event received
  ├── document.visibilityState === 'visible' → in-app toast + UI update
  └── document.visibilityState === 'hidden'  → Notification.requestPermission()
                                                → showNotification(...)
```

Request notification permission **lazily** on the first relevant event — not on page load. Service Worker push (tab fully closed) is a possible future extension.

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
3. **D1 writes** — event inserts (`INSERT OR IGNORE`), match state upserts, guild activity updates
4. **Cold-start recovery** — DO constructor reads D1 match state to rebuild in-memory snapshot
5. **SSE endpoint** — Worker route that serves current state from D1 then streams from DO
6. **`Last-Event-ID` replay** — missed event catch-up on reconnect
7. **Client integration** — replace `useMatch` polling with `EventSource`, remove `useObjectiveTracker`
8. **Subscription filtering** — matchId and guild scoping on the SSE endpoint
9. **Browser Notifications** — visibility-aware routing
10. **Reset detection** — ID change detection, pre-reset summary, wipe
11. **Lazy loading + pagination** — bounded seed window, backward pagination UI
12. **Adaptive intervals** — rolling event rate, dynamic alarm interval

---

## Related Existing Code

| File                                             | Current role                                     | V2 fate                                              |
| ------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------- |
| `apps/gw2w2w/src/lib/wvw/useMatch.ts`            | Polls GW2 API via `useQuery` + `refetchInterval` | Replaced by `EventSource` hook                       |
| `apps/gw2w2w/src/lib/wvw/useObjectiveTracker.ts` | Client-side diff + event detection               | Logic moves server-side into DO; file removed        |
| `apps/gw2w2w/src/lib/store/objectiveLog.ts`      | Ephemeral in-memory event log                    | Backed by D1; seeded on connect                      |
| `apps/gw2w2w/src/lib/api/gw2/`                   | Direct GW2 API client                            | No longer called from client                         |
| `apps/service-api/`                              | REST proxy to GW2 API                            | Home for MatchupPoller DO, SSE endpoint, D1 bindings |
