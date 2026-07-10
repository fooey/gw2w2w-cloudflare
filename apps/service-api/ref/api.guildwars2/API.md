# Guild Wars 2 API Reference

Local reference documentation for the GW2 API v2, focused on endpoints consumed by this project.

- **Base URL:** `https://api.guildwars2.com/v2`
- **Format:** JSON
- **Auth:** Most endpoints are public (no key required). Authenticated endpoints require an `Authorization: Bearer <token>` header.
- **Localisation:** Append `?lang=en|de|es|fr|zh|ko` to any endpoint that supports it.
- **Bulk expansion:** Most list endpoints accept `?ids=1,2,3` or `?ids=all` to fetch multiple objects in one request.

Full API reference: <https://wiki.guildwars2.com/wiki/API:2>

---

## About this document

This file was built by:

1. Reading the wiki for each consumed endpoint (<https://wiki.guildwars2.com/wiki/API:2>)
2. Fetching live responses from the GW2 API and saving representative samples to [`samples/`](samples/)
3. Cross-referencing the observed shapes against the TypeScript types in `apps/service-api/src/lib/resources/` and `apps/service-api/src/types.ts`
4. Fixing any type mismatches found (e.g. `claimed_by: string | null`, optional `guild_upgrades`, narrowed union types)

### Keeping it up to date

**When the GW2 API changes** (check `/v2/build` — a build bump can indicate static data changes):

- Re-fetch any affected sample: `curl https://api.guildwars2.com/v2/<endpoint> | jq .` and replace the relevant file under `samples/`
- Update the TypeScript schema in this file if the shape changed
- Update the corresponding type file in `src/lib/resources/` and run `pnpm check-types`

**When we start consuming a new GW2 endpoint:**

1. Add a section here following the existing pattern (wiki link, TypeScript schema, sample file link)
2. Fetch a real response and save it to `samples/<name>.json`
3. Add the endpoint to `AGENTS.md` under "GW2 API Endpoints"

**When the service-api adds a new internal endpoint** (e.g. a new timer sub-type):

- Document the response shape under the relevant section with an "App note" callout (see the timers section for an example)

### Splitting considerations

Currently ~590 lines across ~22 endpoints — comfortable as a single file. If WvW coverage grows significantly (guild upgrade detail, skirmish breakdowns, EotM) consider splitting into `WvW.md` + `Guild.md` and updating `AGENTS.md` to point to both.

---

## World vs. World (WvW)

Root: `GET /v2/wvw` → `["abilities","guilds","matches","objectives","ranks","timers","upgrades"]`

Wiki: <https://wiki.guildwars2.com/wiki/API:2/wvw>

### `/v2/wvw/matches`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/wvw/matches>
**Scope:** none | **Auth:** not required

Returns active WvW matchups. This endpoint has **three distinct scoping modes** that affect the shape of the returned data, plus two sub-endpoint paths.

#### Scoping / Parameters

| Parameter          | Example                      | Effect                                                                                                                     |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| _(none)_           | `/v2/wvw/matches`            | Returns array of active match ID strings                                                                                   |
| `?ids=all`         | `/v2/wvw/matches?ids=all`    | Returns full match objects for all active matches (very large — includes all objectives, skirmishes, scores, kills/deaths) |
| `?ids=<id>`        | `/v2/wvw/matches?ids=2-1`    | Returns array with single full match object                                                                                |
| `?world=<worldId>` | `/v2/wvw/matches?world=2003` | Returns single full match object for the match containing that world                                                       |
| `/<id>`            | `/v2/wvw/matches/2-1`        | Returns single full match object                                                                                           |

**Priority order**: `world` > `id` > `ids` (if multiple params supplied, only the highest-priority is used)

#### Sub-endpoints

These sub-endpoints return a **reduced** schema — useful for polling specific data without fetching the full ~50 KB per match payload.

| Sub-endpoint                       | Returned fields                                        | Use case                                |
| ---------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| `/v2/wvw/matches/overview?ids=all` | `id`, `worlds`, `all_worlds`, `start_time`, `end_time` | Which worlds are linked; match schedule |
| `/v2/wvw/matches/scores?ids=all`   | `id`, `scores`, `maps[].{type,scores}`                 | Scores-only, per map                    |
| `/v2/wvw/matches/stats?ids=all`    | `id`, `kills`, `deaths`, `maps[].{type,kills,deaths}`  | Kill/death counts, per map              |

All sub-endpoints support the same `?ids=`, `?ids=all`, and `?world=` parameters.

#### Full Match Object Schema (`?ids=all`)

```ts
interface WvwMatch {
  id: string; // e.g. "2-1" (region-tier, 1=NA/2=EU)
  start_time: string; // ISO-8601
  end_time: string; // ISO-8601
  scores: TeamScores; // cumulative VP score per team colour
  worlds: TeamValues<number>; // primary world ID per team
  all_worlds: TeamValues<number[]>; // all linked world IDs per team (includes virtual "alliance" IDs > 10000)
  deaths: TeamValues<number>;
  kills: TeamValues<number>;
  victory_points: TeamValues<number>; // skirmish VP tally
  skirmishes: Skirmish[];
  maps: WvwMap[];
}

interface TeamValues<T> {
  red: T;
  blue: T;
  green: T;
}

// Alias for scores (same shape)
type TeamScores = TeamValues<number>;

interface Skirmish {
  id: number; // skirmish number within the matchup week (1-based)
  scores: TeamScores;
  map_scores: Array<{
    type: MapType;
    scores: TeamScores;
  }>;
}

type MapType = 'Center' | 'RedHome' | 'BlueHome' | 'GreenHome';

interface WvwMap {
  id: number; // map ID (resolvable against /v2/maps)
  type: MapType;
  scores: TeamScores;
  bonuses: Array<{
    type: string; // e.g. "Bloodlust"
    owner: TeamColor;
  }>;
  objectives: WvwObjective[];
  deaths: TeamScores;
  kills: TeamScores;
}

type TeamColor = 'Red' | 'Blue' | 'Green' | 'Neutral';

interface WvwObjective {
  id: string; // "<mapId>-<objectiveId>", resolvable against /v2/wvw/objectives
  type: ObjectiveType;
  owner: TeamColor;
  last_flipped: string; // ISO-8601
  claimed_by?: string | null; // guild UUID, absent on unclaim-able objectives (Spawn, Ruins)
  claimed_at?: string | null; // ISO-8601, absent on unclaim-able objectives
  points_tick: number;
  points_capture: number;
  yaks_delivered?: number; // absent on unclaim-able objectives
  guild_upgrades?: number[]; // guild upgrade IDs (/v2/guild/upgrades), absent on unclaim-able
}

type ObjectiveType = 'Spawn' | 'Camp' | 'Tower' | 'Keep' | 'Castle' | 'Ruins' | 'Mercenary' | 'Resource' | 'Generic';
```

> **Note:** The `kills` and `deaths` values in the API do not match in-game statistics. This is a known API bug. See: <https://github.com/arenanet/api-cdi/issues/519>

> **Note:** World IDs above `10000` (e.g. `12003`) are **virtual alliance IDs** introduced with the World Restructuring system. These are not real server IDs and will not resolve against `/v2/worlds`.

#### Overview Sub-endpoint Schema

```ts
interface WvwMatchOverview {
  id: string;
  worlds: TeamValues<number>;
  all_worlds: TeamValues<number[]>;
  start_time: string;
  end_time: string;
}
```

#### Stats Sub-endpoint Schema

```ts
interface WvwMatchStats {
  id: string;
  deaths: TeamScores;
  kills: TeamScores;
  maps: Array<{
    id: number;
    type: MapType;
    deaths: TeamScores;
    kills: TeamScores;
  }>;
}
```

**Sample files:**

- [`samples/wvw-matches-root.json`](samples/wvw-matches-root.json) — root endpoint (array of IDs)
- [`samples/wvw-matches-all-single.json`](samples/wvw-matches-all-single.json) — single match from `?ids=all`
- [`samples/wvw-matches-overview-all.json`](samples/wvw-matches-overview-all.json) — full overview response
- [`samples/wvw-matches-stats-all.json`](samples/wvw-matches-stats-all.json) — full stats response

---

### `/v2/wvw/matches/stats/:id/teams`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/wvw/matches/stats/:id/teams>
**Scope:** none | **Auth:** not required

Hierarchical endpoint for guild kill/death leaderboards within a match. Navigate the path progressively:

| Path                                               | Returns                                  |
| -------------------------------------------------- | ---------------------------------------- |
| `/v2/wvw/matches/stats/:id/teams`                  | `["red","blue","green"]`                 |
| `/v2/wvw/matches/stats/:id/teams/:color`           | `["top"]`                                |
| `/v2/wvw/matches/stats/:id/teams/:color/top`       | `["kills","kdr"]`                        |
| `/v2/wvw/matches/stats/:id/teams/:color/top/kills` | Top 10 guilds sorted by total kills      |
| `/v2/wvw/matches/stats/:id/teams/:color/top/kdr`   | Top 10 guilds sorted by Wilson score KDR |

```ts
// Response for /teams/:color/top/kills or /teams/:color/top/kdr
interface WvwTeamGuildStat {
  guild_id: string; // resolvable against /v2/guild/:id
  deaths: { red: number; blue: number; green: number };
  kills: { red: number; blue: number; green: number };
  wilson?: number; // Wilson score — only present in /kdr response
}
```

**Sample file:**

- [`samples/wvw-matches-stats-teams-root.json`](samples/wvw-matches-stats-teams-root.json) — root sub-endpoint (`["red","blue","green"]`)

> **Note:** Top guild arrays return empty (`[]`) early in the WvW week before sufficient data has accumulated.

---

### `/v2/wvw/objectives`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/wvw/objectives>
**Scope:** none | **Auth:** not required

Static reference data for all WvW objectives (camps, towers, keeps, etc.). IDs match the `id` field in `/v2/wvw/matches` objective objects.

```ts
interface WvwObjectiveDef {
  id: string; // "<mapId>-<objectiveNum>"
  name: string;
  type: ObjectiveType;
  sector_id: number; // resolvable against /v2/continents
  map_id: number;
  map_type: MapType | 'EdgeOfTheMists';
  coord: [number, number, number]; // [x, y, z]
  label_coord: [number, number]; // [x, y] sector centroid
  marker: string; // icon URL (neutral/gray version)
  chat_link: string;
  upgrade_id?: number; // resolvable against /v2/wvw/upgrades
}
```

> **Known bug:** Coordinates for Arid Fortress, Overgrown Fane, and Thunder Hollow are incorrect (duplicated from the Reactor objective of those maps).

**Sample file:** [`samples/wvw-objectives.json`](samples/wvw-objectives.json)

---

### `/v2/wvw/upgrades`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/wvw/upgrades>
**Scope:** none | **Auth:** not required

Objective upgrade tiers (Secured / Reinforced / Fortified). IDs match `upgrade_id` in `/v2/wvw/objectives` and `guild_upgrades[]` entries in match objective objects reference `/v2/guild/upgrades` (not this endpoint).

```ts
interface WvwUpgrade {
  id: number;
  tiers: Array<{
    name: string; // "Secured" | "Reinforced" | "Fortified"
    yaks_required: number;
    upgrades: Array<{
      name: string;
      description: string;
      icon: string; // render URL
    }>;
  }>;
}
```

## **Sample file:** [`samples/wvw-upgrades.json`](samples/wvw-upgrades.json)

### `/v2/wvw/abilities`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/wvw/abilities>
**Scope:** none | **Auth:** not required

WvW World Experience (WXP) abilities that players can purchase with WvW experience points.

```ts
interface WvwAbility {
  id: number;
  name: string;
  description: string;
  icon: string; // render URL
  ranks: Array<{
    cost: number; // cumulative WXP cost
    effect: string;
  }>;
}
```

**Sample file:** [`samples/wvw-abilities.json`](samples/wvw-abilities.json)

---

### `/v2/wvw/ranks`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/wvw/ranks>
**Scope:** none | **Auth:** not required

WvW rank titles keyed by rank ID. Each rank has a minimum WvW level requirement.

```ts
interface WvwRank {
  id: number;
  title: string;
  min_rank: number;
}
```

**Sample file:** [`samples/wvw-ranks.json`](samples/wvw-ranks.json)

---

### `/v2/wvw/guilds`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/wvw/guilds>
**Scope:** none | **Auth:** not required

Root returns available region sub-endpoints: `["na","eu"]`.

**Sample files:**

- [`samples/wvw-guilds-root.json`](samples/wvw-guilds-root.json) — root endpoint (region list)
- [`samples/wvw-guilds-na.json`](samples/wvw-guilds-na.json) — NA region guild→team mapping (truncated)

#### `/v2/wvw/guilds/:region`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/wvw/guilds/:region>

Returns a flat `Record<guildId, teamId>` mapping every guild that participated in WvW matchmaking for the given region during the current or most recent match window.

- `region` — `"na"` or `"eu"`
- Keys — guild UUIDs (resolvable against `/v2/guild/:id`)
- Values — WvW team IDs (e.g. `"11007"`, `"12004"`) — these are virtual alliance team IDs matching the keys in the project's `definitions/wvw-teams.ts`; there is no GW2 API endpoint to resolve them

```ts
type WvwGuildsRegion = Record<string, string>; // { [guildId: string]: teamId }
```

> **Note:** Responses are very large (thousands of guild UUIDs). Cache aggressively — data only changes at weekly reset.

---

### `/v2/wvw/timers`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/wvw/timers>
**Scope:** none | **Auth:** not required

Root returns available sub-endpoints: `["lockout","teamAssignment"]`.

> **App note:** These GW2 endpoints are **not consumed** by this project. Match timing is derived directly from `start_time` / `end_time` on the match object from `/v2/wvw/matches`, which is already fetched and is more reliable than computing it from a hardcoded schedule.

**Sample files (GW2 API responses):**

- [`samples/wvw-timers-root.json`](samples/wvw-timers-root.json) — root endpoint (sub-endpoint list)
- [`samples/wvw-timers-lockout.json`](samples/wvw-timers-lockout.json) — lockout timestamps per region
- [`samples/wvw-timers-teamassignment.json`](samples/wvw-timers-teamassignment.json) — team assignment timestamps per region

#### `/v2/wvw/timers/lockout`

Returns a flat object with the lockout timestamp for each region. The lockout date is the point at which the current WvW matchup was locked in (past date = when the current week started).

```ts
interface WvwTimersLockout {
  na: string; // ISO-8601
  eu: string; // ISO-8601
}
```

#### `/v2/wvw/timers/teamAssignment`

Returns a flat object with the date when team assignments will next be finalised for each region (i.e., when the next match selection locks in at the upcoming weekly reset).

```ts
interface WvwTimersTeamAssignment {
  na: string; // ISO-8601
  eu: string; // ISO-8601
}
```

---

## Guild

### `/v2/guild/:id`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/guild/:id>
**Scope:** none (public fields) | **Auth:** not required for basic info

Returns public guild data including name, tag, and emblem definition.

```ts
interface Guild {
  id: string; // guild UUID
  name: string;
  tag: string; // 2–4 letter tag
  emblem: {
    background: {
      id: number; // resolvable against /v2/emblem/backgrounds
      colors: number[]; // color IDs, resolvable against /v2/colors
    };
    foreground: {
      id: number; // resolvable against /v2/emblem/foregrounds
      colors: number[];
    };
    flags: GuildEmblemFlag[];
  };
}

type GuildEmblemFlag =
  'FlipBackgroundHorizontal' | 'FlipBackgroundVertical' | 'FlipForegroundHorizontal' | 'FlipForegroundVertical';
```

**Sample file:** [`samples/guild-id.json`](samples/guild-id.json) — ArenaNet guild (public guild, no auth required)

---

### `/v2/guild/search`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/guild/search>
**Scope:** none | **Auth:** not required

```
GET /v2/guild/search?name=<name>
```

Returns array of guild UUIDs matching the given name (exact match, case-insensitive). Returns `[]` if no match.

**Sample file:** [`samples/guild-search.json`](samples/guild-search.json)

---

## Emblem

### `/v2/emblem/backgrounds`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/emblem/backgrounds>
**Scope:** none | **Auth:** not required

```ts
interface EmblemLayer {
  id: number;
  layers: string[]; // render URLs for each compositing layer PNG
}
```

**Sample file:** [`samples/emblem-backgrounds.json`](samples/emblem-backgrounds.json)

---

### `/v2/emblem/foregrounds`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/emblem/foregrounds>
**Scope:** none | **Auth:** not required

Same shape as `/v2/emblem/backgrounds`.

**Sample file:** [`samples/emblem-foregrounds.json`](samples/emblem-foregrounds.json)

---

## Colors

### `/v2/colors`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/colors>
**Scope:** none | **Auth:** not required

Returns dye/color definitions. Each color includes RGB base values and per-material detail matrices.

```ts
interface GuildColor {
  id: number;
  name: string;
  base_rgb: [number, number, number];
  cloth: ColorDetail;
  leather: ColorDetail;
  metal: ColorDetail;
  fur?: ColorDetail;
  item?: number;
  categories: string[];
}

interface ColorDetail {
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
  lightness: number;
  rgb: [number, number, number];
}
```

**Sample file:** [`samples/colors.json`](samples/colors.json)

---

## Worlds

### `/v2/worlds`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/worlds>
**Scope:** none | **Auth:** not required

Returns the list of GW2 worlds (servers). First digit of ID indicates region (`1` = NA, `2` = EU). Second digit indicates language (`1` = French, `2` = German, `3` = Spanish).

> **Note:** With World Restructuring, virtual alliance IDs (`> 10000`) appear in WvW match data but will NOT resolve against this endpoint.

```ts
interface World {
  id: number;
  name: string;
  population: 'Low' | 'Medium' | 'High' | 'VeryHigh' | 'Full';
}
```

**Sample file:** [`samples/worlds.json`](samples/worlds.json)

---

## Miscellaneous

### `/v2/build`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/build>
**Scope:** none | **Auth:** not required

Returns the current game build ID. Useful for cache invalidation — if the build ID changes, static data endpoints (items, objectives, etc.) may have changed.

```ts
interface Build {
  id: number;
}
```

**Sample file:** [`samples/build.json`](samples/build.json)

---

### `/v2/files`

**Wiki:** <https://wiki.guildwars2.com/wiki/API:2/files>
**Scope:** none | **Auth:** not required

Returns commonly requested in-game asset icon URLs by string ID. Supports bulk expansion (`?ids=all` or `?ids=map_complete,wvw_camp,...`).

```ts
interface GameFile {
  id: string; // e.g. "wvw_camp", "map_complete", "wvw_keep"
  icon: string; // render service URL
}
```

Common WvW-relevant file IDs: `wvw_camp`, `wvw_tower`, `wvw_keep`, `wvw_castle`, and per-color variants like `wvw_camp_blue`, `wvw_tower_red`, etc.

**Sample file:** [`samples/files.json`](samples/files.json)

---

## Match ID Format

WvW match IDs follow the format `<region>-<tier>`:

| ID    | Region | Tier         |
| ----- | ------ | ------------ |
| `1-1` | NA     | Tier 1 (top) |
| `1-2` | NA     | Tier 2       |
| `1-3` | NA     | Tier 3       |
| `1-4` | NA     | Tier 4       |
| `2-1` | EU     | Tier 1 (top) |
| `2-2` | EU     | Tier 2       |
| `2-3` | EU     | Tier 3       |
| `2-4` | EU     | Tier 4       |
| `2-5` | EU     | Tier 5       |

NA resets Friday ~02:00 UTC, EU resets Friday ~18:00 UTC.

## Map IDs

| Map ID | Name                       | Type        |
| ------ | -------------------------- | ----------- |
| `38`   | Eternal Battlegrounds      | `Center`    |
| `1099` | Red Borderlands (Alpine)   | `RedHome`   |
| `96`   | Blue Borderlands (Desert)  | `BlueHome`  |
| `95`   | Green Borderlands (Alpine) | `GreenHome` |

> The specific borderland map type (Alpine/Desert/Obsidian Sanctum) rotates and is not reflected in the API — only the color (`RedHome`/`BlueHome`/`GreenHome`) is returned.
