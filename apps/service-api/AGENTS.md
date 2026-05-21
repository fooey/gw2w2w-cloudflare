# service-api — Agent Instructions

Rules specific to `apps/service-api`. The root [AGENTS.md](../../AGENTS.md) covers monorepo-wide conventions — don't repeat those here.

## Route Conventions

- Every route handler must have a `describeRoute()` middleware with `summary`, `tags`, and `responses`
- Every **JSON** `200` response in `describeRoute` must include a `content` block using `resolver()` from `hono-openapi` so the OpenAPI spec and Scalar UI show the full response schema. Exceptions: SSE endpoints (`/wvw/stream`) and custom WvW endpoints that return complex paginated payloads without a Zod schema yet (`/wvw/events`, `/wvw/guilds`) — these only need a `description` until their schemas are converted.
- Use `validator()` from `hono-openapi` for parameter/query validation — not `zValidator` from `@hono/zod-validator`
- Prefer `withCacheJson(c, ttl, data)` over bare `c.json()` for GET endpoints to apply HTTP cache headers
- Route files export a Hono router instance; index files compose them with `.route()`

## Schema Conventions

GW2-proxied resource schemas in `src/lib/resources/` and `src/lib/types/` use **Zod-first schemas** — no plain TypeScript interfaces.

- Define types as `z.object()` schemas exported as `const MyThingSchema = z.object({ ... })`
- Export the TypeScript type as `export type MyThing = z.infer<typeof MyThingSchema>` — the schema is the single source of truth
- Import the schema into the corresponding route file and pass it to `resolver()` in the `describeRoute` response
- Add `.describe()` to all fields where the semantics are non-obvious: numeric ranges, ISO 8601 timestamps, GW2-specific IDs, null/absent distinctions, CDN URLs, etc.
- Use the `wvwMatchTeams` generic helper in `src/lib/resources/wvw/matches.ts` when you need `{ red: T, blue: T, green: T }` — do not repeat the pattern inline
- The `resolver()` import comes from `hono-openapi` (not the non-existent `hono-openapi/zod` subpath)
- Custom WvW response types (`EventLogResponse`, `GuildActivityResponse`, `WvWMatchTeams<T>`) are plain interfaces — convert them to Zod schemas when adding `resolver()` to those routes

## OpenAPI Maintenance

- `routes/openapi.ts` owns the `OPENAPI_TAGS` array and the `/doc` + `/scalar` endpoints
- When adding a new route group, add a corresponding tag entry to `OPENAPI_TAGS`
- Tag descriptions must indicate the data source: "Proxied from GW2 API (v2/...)" or "Custom. ..."
- `createOpenAPIRoutes(app)` must be mounted **after** all other routes so the spec is complete

## Durable Object Patterns (MatchupPoller)

- **Error recovery is critical.** An unhandled exception in `alarm()` kills the poll loop permanently — the DO has no external supervisor to restart it. Every code path must be wrapped in try/catch and must never rethrow.
- **Alarm-first scheduling:** Reschedule the alarm at the **start** of `alarm()` before doing work — this ensures the loop continues even if execution is killed
- **Constructor guard:** Use `blockConcurrencyWhile()` in the constructor; check `getAlarm()` before setting a new one to avoid duplicates
- **SSE subscribers:** Stored in a `Map<string, Subscriber>` keyed by UUID; clean up via `request.signal.addEventListener('abort', ...)`
- **Write timeouts:** Fanout to SSE writers must use a timeout to prevent stalled connections from blocking the poll loop
- **Cold start:** Rebuild in-memory state from D1 inside `blockConcurrencyWhile` before the first alarm fires
- **Rate limit backoff:** On 429 from the GW2 API, adjust the next alarm using `retryAfterMs` instead of the normal interval

## Caching

- **Cache API responses** are immutable — always construct `new Response(cached.body, cached)` before returning so downstream middleware can mutate headers
- **Use `waitUntil`** for cache writes: `c.executionCtx.waitUntil(cache.put(...))` to avoid blocking the response
- **Request coalescing:** Module-scope `Map` objects (`kvInflight`, `objectInflight`) deduplicate concurrent fetches for the same key
- **Stale fallback:** On upstream 429, `withObjectCache` returns stale R2 data if available rather than failing

## Entry Point (`index.ts`)

- The Durable Object class must be re-exported: `export { MatchupPoller }` (required by Wrangler)
- Export `ServiceApiAppType = typeof app` for RPC-style type safety in the frontend
- The `scheduled` handler must call `checkBuildId()` for cache invalidation and ping the DO to keep the alarm loop alive

## Build Watcher Cron

- Runs every 15 minutes via Wrangler cron trigger
- Compares GW2 API `/v2/build` against the stored build ID in KV
- On mismatch: purges stale R2 keys in `STATIC_CACHE_KEYS`, updates KV, triggers `warmStaticCaches()`
