# service-api

Hono Worker that serves as the backend for [gw2w2w.com](https://gw2w2w.com). Proxies the Guild Wars 2 API with tiered caching and provides real-time WvW event tracking via D1 + SSE.

**Production:** `api.gw2w2w.com`

## Local Development

```sh
pnpm dev          # starts wrangler on port 8788
pnpm dev:seed     # seeds local D1 with sample data
pnpm db:replicate # replicates production D1 to local
```

## API Endpoints

Interactive API reference available at [`/scalar`](https://api.gw2w2w.com/scalar), with raw OpenAPI JSON at [`/doc`](https://api.gw2w2w.com/doc). All GW2-proxied endpoints document their full response schema — types are defined as Zod schemas and wired into the spec via `resolver()` in each route's `describeRoute`.

### Proxied GW2 API (`/gw2/...`)

Data sourced from the official [Guild Wars 2 API](https://wiki.guildwars2.com/wiki/API:Main), cached locally with tiered TTLs.

| Route                             | Description                   |
| --------------------------------- | ----------------------------- |
| `/gw2/color`                      | List all dye colors           |
| `/gw2/color/:colorId`             | Get color by ID               |
| `/gw2/emblem/background`          | List emblem backgrounds       |
| `/gw2/emblem/foreground`          | List emblem foregrounds       |
| `/gw2/emblem/:layer/:emblemId`    | Get emblem layer by ID        |
| `/gw2/guild/upgrades?ids=`        | Batch get guild upgrades      |
| `/gw2/guild/search?name=`         | Search guild by name          |
| `/gw2/guild/:guildId`             | Get guild by ID               |
| `/gw2/wvw/abilities`              | List WvW abilities            |
| `/gw2/wvw/abilities/:id`          | Get ability by ID             |
| `/gw2/wvw/guilds/guild/:guildId`  | Get WvW guild by ID           |
| `/gw2/wvw/guilds/region/:region`  | List guilds by region (na/eu) |
| `/gw2/wvw/guilds/team/:teamId`    | List guilds by team           |
| `/gw2/wvw/matches`                | List all WvW matches          |
| `/gw2/wvw/matches/stats/teams`    | Flattened per-team stats      |
| `/gw2/wvw/matches/:id`            | Get match by ID               |
| `/gw2/wvw/matches/world/:worldId` | Get match by world ID         |
| `/gw2/wvw/objectives`             | List WvW objectives           |
| `/gw2/wvw/objectives/:id`         | Get objective by ID           |
| `/gw2/wvw/ranks`                  | List WvW ranks                |
| `/gw2/wvw/ranks/:id`              | Get rank by ID                |
| `/gw2/wvw/teams`                  | List WvW teams                |
| `/gw2/wvw/teams/team/:teamId`     | Get team by ID                |
| `/gw2/wvw/upgrades`               | List WvW upgrades             |
| `/gw2/wvw/upgrades/:id`           | Get upgrade by ID             |

### Custom Endpoints (`/wvw/...`)

Service-api-owned endpoints backed by D1 and Durable Objects.

| Route                  | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `/wvw/matches`         | Cached match state snapshots from D1               |
| `/wvw/events?matchId=` | Paginated event log (captures/claims) from D1      |
| `/wvw/guilds?matchId=` | Aggregated guild claim activity from D1            |
| `/wvw/stream?matchId=` | SSE stream of real-time match updates via DO       |
| `/wvw/stream/status`   | Current status of the MatchupPoller Durable Object |

## Architecture

### Caching Strategy

Proxied GW2 API data is cached with tiered TTLs defined in `src/lib/resources/constants.ts`:

| Tier        | KV TTL   | HTTP TTL | Use Case                        |
| ----------- | -------- | -------- | ------------------------------- |
| `patch`     | 30 days  | 1 day    | Build-invalidated data (colors) |
| `immutable` | 365 days | 365 days | Textures                        |
| `user`      | 1 day    | 12 hours | Guilds                          |
| `live`      | 5 min    | 20 sec   | Match scores, objective timers  |

A cron job runs every 15 minutes (`buildWatcher`) to check the GW2 API build ID. When a new build is detected, it purges stale R2 keys and warms the cache.

### MatchupPoller Durable Object

The `MatchupPoller` DO polls the GW2 API `/v2/wvw/matches` every 20 seconds using alarm-based scheduling. It:

- Diffs match state to detect objective captures and guild claims
- Writes events to the `events` table in D1
- Fans out SSE updates to all subscribed clients

### D1 Schema

- **`match_state`** — latest cached match JSON blob per match ID
- **`events`** — objective capture/claim event log with columns: `match_id`, `type`, `at`, `objective_id`, `objective_type`, `map_type`, `owner`, `claimed_by`

### Bindings

| Binding                      | Type           | Purpose                     |
| ---------------------------- | -------------- | --------------------------- |
| `MATCHUP_POLLER`             | Durable Object | Real-time WvW polling + SSE |
| `WVW_DB`                     | D1 Database    | Event log + match state     |
| `EMBLEM_ENGINE_GUILD_LOOKUP` | KV Namespace   | Guild emblem spec cache     |
| `EMBLEM_ASSETS`              | R2 Bucket      | Cached GW2 API responses    |

## Testing

```sh
pnpm test         # run once
pnpm test:watch   # watch mode
```

Smoke tests cover `/robots.txt`, `/favicon.ico`, and 404 error shape. Tests use Vitest with mocked `cloudflare:workers`.
