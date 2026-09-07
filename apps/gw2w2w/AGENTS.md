# gw2w2w — Agent Instructions

Rules specific to `apps/gw2w2w`. The root [AGENTS.md](../../AGENTS.md) covers monorepo-wide conventions (including React Compiler rules) — don't repeat those here.

## React Router / Vite / Cloudflare Workers

- This app is React Router v8 in framework mode, built by Vite and running on Cloudflare Workers via `@cloudflare/vite-plugin` — there is no Node.js runtime
- The Worker entry is `workers/app.ts`; `src/routes.ts` declares the route table and `src/root.tsx` is the document shell
- Bindings (R2, KV, Service Bindings) reach loaders and actions through the typed load context: `context.get(cloudflareContext)` returns `{ env, ctx }`. There is no ambient accessor — pass `env` explicitly to helpers like `getApi(env)`
- Do not use Node.js-only APIs; use `@js-temporal/polyfill` for `Temporal`. It is installed at the top of `workers/app.ts` because workerd lacks the global and that entry is the only module guaranteed to run before any route
- `import.meta.env.PROD` (not `process.env.NODE_ENV`) selects production behaviour, including the `SERVICE_API` service-binding path
- Type checking uses TypeScript 7's native `tsc` (`tsc --noEmit --checkers 4`); `react-router typegen` must run first so generated `./+types/*` route modules exist

## Route vs UI Separation

- Route modules (`src/routes/**`) should contain minimal UI — loaders/actions, `meta`, and composition of components
- All substantive UI lives in `src/ui/` (shared components) and `src/lib/ui/` (feature-specific components)
- Keep route files thin: fetch data, import components, compose layout — no complex markup or styling
- Server-only work belongs in the loader, not the component: a loader runs once per request and its data feeds both `meta` and the component

## Photon WASM

- `@silvia-odwyer/photon` is a WASM image compositing library used in the emblem designer
- It must be lazy-loaded on the client only — do not import at module scope in server components
- The `TextureCacheManager` gates texture downloads; do not fetch textures outside its cache

## Service Bindings

- `SERVICE_API` and `SERVICE_EMBLEM` are Cloudflare Service Bindings to sibling Workers
- In development, the API client falls back to `http://localhost:8788` via standard fetch
- Guild emblem URLs route through `SERVICE_EMBLEM` in production

## SSE / Real-time

- `useMatchSSE` connects to `service-api`'s `/wvw/stream` via `EventSource`
- The hook handles `matchState`, `capture`, `claim`, and `reset` event types
- On `reset` events (match rollover), the page reloads to pick up new match data

## Links and Navigation

- Use `#ui/Link`, not React Router's `Link` directly — the wrapper keeps an `href` prop, falls back to a plain `<a>` for external/absolute URLs, and defaults to `prefetch="intent"` (hover/focus)
- Build internal paths with React Router's `href()` helper so a renamed route is a type error: `href('/guilds/:guildId', { guildId })`
- `href()` percent-encodes params itself — pass raw values, never `encodeURIComponent(...)` output, or they double-encode

## URL State

- The emblem designer serializes state to URL params (`?s=` shortlinks)
- Ensure state round-trips correctly through `encodeURIComponent`/`decodeURIComponent`

## Texture Proxy (`/api/texture`)

- Proxies PNG textures from `render.guildwars2.com` with R2 caching
- Validates hostname and path prefix to prevent SSRF — do not weaken these checks
