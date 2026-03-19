# Project Context: gw2w2w-cloudflare

## Documentation Maintenance

**Always keep `README.md` up to date.** When you add, remove, or significantly change a feature, architecture decision, or package, update the relevant sections of `README.md` in the same change. This includes:

- The **Features** list
- The **Architecture** diagram and tables
- The **Rendering Engine** section
- The **Key Design Decisions** section
- The **Tech Stack** section

## Overview

An open-source suite of utilities for Guild Wars 2 players, built as a Turborepo monorepo on the Cloudflare edge.

- **Guild Emblem Hotlinks** — Render any guild's emblem as a WebP image by name or ID. `emblem.gw2w2w.com/<guildId>`
- **Emblem Designer** — Interactive client-side editor to build and preview custom emblems.
- **WvW tools** — WIP: objective tracking and team/guild directory.

## Monorepo Structure

### Apps

| App                   | Domain              | Runtime                                       | Port |
| --------------------- | ------------------- | --------------------------------------------- | ---- |
| `apps/gw2w2w`         | `gw2w2w.com`        | Next.js 15 via OpenNext on Cloudflare Workers | 3000 |
| `apps/service-emblem` | `emblem.gw2w2w.com` | Hono on Cloudflare Workers                    | 8787 |
| `apps/service-api`    | `api.gw2w2w.com`    | Hono on Cloudflare Workers                    | 8788 |

### Packages

| Package                      | Description                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `packages/emblem-renderer`   | Emblem rendering logic. `pixels.ts` — shared pure compositing loop. `index.ts` — server-side Photon WASM wrapper (Workers only). |
| `packages/utils`             | Shared routing, validation, string utilities                                                                                     |
| `packages/eslint-config`     | Shared ESLint config                                                                                                             |
| `packages/typescript-config` | Shared TypeScript config                                                                                                         |

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 15 + React 19, Tailwind CSS v4, deployed via `@opennextjs/cloudflare`
- **Backend**: Hono (two Workers: `service-emblem`, `service-api`)
- **Storage**: Cloudflare R2 (`EMBLEM_ASSETS` bucket — textures, rendered emblems), Cloudflare KV (`EMBLEM_ENGINE_GUILD_LOOKUP` — guild name→id mappings)
- **Server rendering**: `@cf-wasm/photon` (Cloudflare Workers-only) for PNG decode, flip transforms, WebP encode
- **Browser rendering**: Native Canvas API (`createImageBitmap`, `OffscreenCanvas`) — no WASM on the client
- **Worker-to-Worker**: Cloudflare Service Bindings + Hono RPC (type-safe, zero network hop)

## Core Rendering Logic

The compositing pipeline is split by platform:

- **`packages/emblem-renderer/pixels.ts`** — Platform-independent. Takes pre-decoded `DecodedLayer` objects (`Uint32Array` pixel buffers) and `ColorRGB` options. Single-pass Porter-Duff "over" compositing loop. Supports isolated layer rendering (bg-only, fg-only, etc.).
- **`packages/emblem-renderer/index.ts`** — Server only. Uses Photon WASM to decode PNGs and apply flip transforms, calls `pixels.ts` to composite, returns a `PhotonImage` for WebP encoding.
- **`apps/gw2w2w/src/lib/ui/designer/decodeLayer.ts`** — Browser only. Uses `createImageBitmap` + `OffscreenCanvas` to decode PNGs and apply flips, returns a `DecodedLayer` for `pixels.ts`.

**Layer indices** (from the GW2 API emblem layer arrays):

- Background: index `[0]`
- Foreground primary fill: index `[1]`
- Foreground secondary fill: index `[2]`

**Flip flags**: `FlipBackgroundHorizontal`, `FlipBackgroundVertical`, `FlipForegroundHorizontal`, `FlipForegroundVertical`

**Color blending**: GW2 texture red channel acts as an opacity mask for a flat RGB color (not a standard multiply blend). Foreground layers use the alpha channel normally.

## Caching Strategy

### Server-side (R2 key format)

- `textures:<encodeURIComponent(gw2RenderUrl)>` — raw PNG ArrayBuffers, 1-year TTL
- `emblems:<guildId>` — rendered WebP bytes, 24h TTL
- `guild:<guildId>` — Guild JSON, 24h TTL
- `backgrounds.json` / `foregrounds.json` — emblem layer definitions, 24h TTL
- KV: `guild-name:<name>` → guild ID, 24h TTL

All TTLs use ±10% random jitter to prevent thundering herd on mass expiry.

### Browser-side (designer)

- **Cache API** (`caches.open('gw2-textures-v1')`) — stores raw PNG responses from `/api/texture`
- **`localStorage` key** `gw2-textures-cached` — marks when the full texture set has been downloaded, gates designer access

## Texture Proxy Route

`GET /api/texture?url=<encoded-url>` in `apps/gw2w2w` serves texture PNGs for the browser designer.

- Validates `url` is strictly `https://render.guildwars2.com/file/...` (SSRF prevention)
- Reads from `EMBLEM_ASSETS` R2 (shared with `service-emblem` — cache is pre-warmed by hotlink renders)
- Falls back to GW2 CDN on miss and writes to R2

## GW2 API Endpoints Used

- `GET /v2/emblem/backgrounds?ids=all` — [docs](https://wiki.guildwars2.com/wiki/API:2/emblem/backgrounds)
- `GET /v2/emblem/foregrounds?ids=all` — [docs](https://wiki.guildwars2.com/wiki/API:2/emblem/foregrounds)
- `GET /v2/colors?ids=all` — [docs](https://wiki.guildwars2.com/wiki/API:2/colors)
- `GET /v2/guild/search?name=<name>` — [docs](https://wiki.guildwars2.com/wiki/API:2/guild/search)
- `GET /v2/guild/<id>` — [docs](https://wiki.guildwars2.com/wiki/API:2/guild/:id)

General API reference: https://wiki.guildwars2.com/wiki/API:Main
