# service-emblem

Hono Worker that renders Guild Wars 2 guild emblems as WebP images. Fetches guild and layer data from `service-api` via Service Binding, composites emblems using Photon WASM, and caches results in R2.

**Production:** `emblem.gw2w2w.com` / `guilds.gw2w2w.com`

## Local Development

```sh
pnpm dev    # starts wrangler on port 8787
```

Requires `service-api` running on port 8788 (accessed via Service Binding in production, RPC client locally).

## Endpoints

| Route                  | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `/:guildId`            | Render emblem by guild ID (UUID) or guild name                   |
| `/:guildId/:size.webp` | Redirects to canonical URL with `?size=` query param             |
| `/custom?bg=&fg=&...`  | Render custom emblem from explicit parts, colors, and flip flags |
| `/guilds/*`            | Legacy redirect to `/:guildId`                                   |
| `/short/:guildId`      | Short URL redirect                                               |

## Architecture

### Rendering Pipeline

1. Resolve guild ID (UUID passthrough or name search via `service-api`)
2. Check R2 cache (`EMBLEM_ASSETS`) by key `emblems:{guildId}:{size}` with TTL in `customMetadata.expiresAt`
3. On miss: fetch guild spec + emblem layers + colors from `service-api`
4. Composite layers using `@repo/emblem-renderer` + Photon WASM
5. Write rendered WebP to R2 asynchronously, return to client

### Bindings

| Binding                      | Type    | Purpose                         |
| ---------------------------- | ------- | ------------------------------- |
| `SERVICE_API`                | Service | Fetches guild/emblem/color data |
| `EMBLEM_ENGINE_GUILD_LOOKUP` | KV      | Guild emblem spec cache         |
| `EMBLEM_ASSETS`              | R2      | Rendered emblem cache           |

### Service API Integration

Uses Hono RPC (`hc`) via the `SERVICE_API` Service Binding for typed, zero-latency calls to `service-api`. The `getApiClient()` helper configures `SERVICE_API.fetch` as the custom fetch implementation.

### Caching

- **R2 object cache:** Rendered emblems stored with `expiresAt` in custom metadata
- **HTTP cache:** Hono `cache()` middleware with `max-age=86400` (24h) for all GET requests
- **Custom emblems:** Served with `max-age=31536000, immutable` (1 year)

## Testing

```sh
pnpm test         # run once
pnpm test:watch   # watch mode
```

Smoke tests cover `/robots.txt` and `/favicon.ico`. Photon WASM is stubbed via `__mocks__/cf-wasm-photon.ts`.
