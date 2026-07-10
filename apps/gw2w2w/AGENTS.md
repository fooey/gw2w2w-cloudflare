# gw2w2w — Agent Instructions

Rules specific to `apps/gw2w2w`. The root [AGENTS.md](../../AGENTS.md) covers monorepo-wide conventions (including React Compiler rules) — don't repeat those here.

## OpenNext / Cloudflare Workers

- This app runs on Cloudflare Workers via `@opennextjs/cloudflare` — there is no Node.js runtime
- `getCloudflareContext()` provides access to Cloudflare bindings (R2, KV, Service Bindings) in server components and API routes
- Do not use Node.js-only APIs; use `@js-temporal/polyfill` for `Temporal` (installed via `instrumentation.ts`)
- Type checking uses TypeScript 7's native `tsc` (`node ./node_modules/typescript7/bin/tsc --noEmit --checkers 4`) before `next build` — see the `build` script and `TODOS.md` for why this app calls it via a `typescript7` alias instead of the plain `tsc` other packages use

## Route vs UI Separation

- Route files (`src/app/**/page.tsx`, `layout.tsx`) should contain minimal UI — just the site shell, data fetching, and composition of components
- All substantive UI lives in `src/ui/` (shared components) and `src/lib/ui/` (feature-specific components)
- Keep route files thin: fetch data, import components, compose layout — no complex markup or styling

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

## URL State

- The emblem designer serializes state to URL params (`?s=` shortlinks)
- Ensure state round-trips correctly through `encodeURIComponent`/`decodeURIComponent`

## Texture Proxy (`/api/texture`)

- Proxies PNG textures from `render.guildwars2.com` with R2 caching
- Validates hostname and path prefix to prevent SSRF — do not weaken these checks
