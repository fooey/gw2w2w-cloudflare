# service-emblem — Agent Instructions

Rules specific to `apps/service-emblem`. The root [AGENTS.md](../../AGENTS.md) covers monorepo-wide conventions — don't repeat those here.

## WASM (Photon)

- `@cf-wasm/photon` provides the WASM image compositing runtime
- WASM modules are handled by the `**/*.wasm → CompiledWasm` rule in `wrangler.toml`
- In tests, Photon is stubbed via `__mocks__/cf-wasm-photon.ts` — update the mock if the Photon API surface changes

## Emblem Rendering Order

- **Background:** flip horizontally first (if flagged), then composite using red channel as mask
- **Foreground:** flip horizontally first (if flagged), then composite using alpha channel
- Compositing is delegated to `@repo/emblem-renderer` — this worker handles I/O and WASM orchestration only
- Always resize **after** compositing, not before

## R2 Caching

- Cache key format: `emblems:{guildId}:{size}`
- Store `expiresAt` ISO string in R2 object's `customMetadata` — check it on read to determine staleness
- Write to R2 via `waitUntil` to avoid blocking the response
- Custom emblems (`/custom`) skip R2 caching and use immutable HTTP cache headers instead

## Service Binding to service-api

- Uses Hono RPC (`hc`) with `SERVICE_API.fetch` as the transport — not raw `fetch()`
- `getApiClient(context)` creates the typed client; all data fetching goes through typed wrapper functions in `lib/api.ts`
- Do not bypass the RPC client to call service-api directly

## Route Patterns

- Guild lookup supports both UUID and name — names are resolved via `searchGuild()` before rendering
- `/:guildId/:size.webp` is a redirect to the canonical `/:guildId?size=` form — do not serve images from this route
