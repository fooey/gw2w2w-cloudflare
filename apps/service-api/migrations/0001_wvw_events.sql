-- Current match state — 9 rows, one per active matchup (IDs are permanent: 1-1..1-4, 2-1..2-5)
-- Upserted on every poll, used to seed new SSE clients without a GW2 API call.
-- end_time is stored as a top-level column for cheap reset detection (string equality vs blob parse).
-- data is WvWMatch with skirmishes[] stripped — skirmish history is excluded from the V2 scope.
CREATE TABLE
  match_state (
    match_id TEXT PRIMARY KEY
  , data TEXT NOT NULL, -- WvWMatchStripped JSON blob (WvWMatch minus skirmishes[])
    end_time TEXT NOT NULL, -- from WvWMatch.end_time; advances on weekly reset
    updated_at TEXT NOT NULL
  );

-- Append-only event log for the current match week.
-- UNIQUE constraint silently deduplicates on cold-start recovery via INSERT OR IGNORE.
CREATE TABLE
  events (
    id INTEGER PRIMARY KEY AUTOINCREMENT
  , match_id TEXT NOT NULL
  , type TEXT NOT NULL, -- 'capture' | 'claim'
    AT TEXT NOT NULL, -- ISO 8601 timestamp from GW2 API (last_flipped or claimed_at)
    objective_id TEXT NOT NULL
  , objective_type TEXT NOT NULL
  , map_type TEXT NOT NULL
  , owner TEXT NOT NULL
  , claimed_by TEXT, -- guild ID, null for capture events
    UNIQUE (match_id, objective_id, type, AT)
  );

-- Cursor-based event feed per match (seeding new SSE clients, Last-Event-ID replay)
CREATE INDEX idx_events_match ON events (match_id, id DESC);

-- Guild event feed + per-guild claim aggregation
CREATE INDEX idx_events_guild ON events (claimed_by, match_id, type, id DESC);

-- Full-match claim leaderboard across all guilds
CREATE INDEX idx_events_claims ON events (match_id, type, claimed_by);
