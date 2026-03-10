# gw2w2w.com

An open-source suite of utilities for [Guild Wars 2](https://www.guildwars2.com/) players, built on the Cloudflare edge. The name is a play on the game's WvW mode — **World vs. World** (WvW) is GW2's large-scale, three-faction PvP mode where servers compete to capture objectives across a persistent map.

## Features

- **Guild Emblem Hotlinks** — Render any guild's emblem (the coat-of-arms-style icon each guild designs in-game) as a WebP image by guild name or ID. Drop a URL into Discord, a forum, or any website. Hosted at `emblem.gw2w2w.com/<guildId>`.
- **Emblem Designer** — WIP: Interactive client-side editor to build and preview emblems from scratch using official ArenaNet assets.
- **WvW Objective Status** — WIP: Real-time tracking of WvW map objectives (towers, keeps, castles) across all active matchups.
- **WvW Teams** — Directory of which guilds are registered to each WvW team.

## Architecture

This is a [Turborepo](https://turbo.build/) monorepo with three deployed Cloudflare Workers and a shared internal package library.

### Applications

| App                   | Domain              | Description                                                                                                        |
| --------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `apps/gw2w2w`         | `gw2w2w.com`        | Next.js 15 frontend, deployed via [OpenNext](https://opennext.js.org/) on Cloudflare Workers (no Node.js required) |
| `apps/service-emblem` | `emblem.gw2w2w.com` | Hono Worker — renders guild emblems as WebP, caches in R2 (port `8787` locally)                                    |
| `apps/service-api`    | `api.gw2w2w.com`    | Hono Worker — GW2 API proxy with KV + R2 tiered caching (port `8788` locally)                                      |

### Packages

| Package                      | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `packages/emblem-renderer`   | Shared emblem rendering logic (WASM / Photon)    |
| `packages/utils`             | Shared routing, validation, and string utilities |
| `packages/eslint-config`     | Shared ESLint configuration                      |
| `packages/typescript-config` | Shared TypeScript configuration                  |

### Rendering Engine

ArenaNet's API provides emblem layers as grayscale textures. Each layer is colorized by treating its texture channel as an opacity mask for a flat GW2 palette color, then alpha-composited together in layer order using a Porter-Duff "over" operation implemented via direct pixel manipulation. The [Photon](https://github.com/silvia-odwyer/photon) WASM library (via the Cloudflare-compatible [`@cf-wasm/photon`](https://www.npmjs.com/package/@cf-wasm/photon) build) is used for image decoding and flip transforms.

The same `emblem-renderer` package is used by both `service-emblem` (server-side WebP generation) and the browser-based Designer (client-side preview), guaranteeing pixel-perfect parity between the designer preview and the final rendered image.

### Caching Strategy

`service-api` uses a two-tier cache to minimize GW2 API calls:

1. **Cloudflare KV** — Fast, globally-replicated cache for API responses.
2. **Cloudflare R2** — Persistent object storage for raw textures and rendered emblem images, so each unique emblem is rendered only once.

## Tech Stack

- **Frontend**: Next.js 15 + React 19, deployed via [@opennextjs/cloudflare](https://github.com/opennextjs/opennextjs-cloudflare)
- **API / Workers**: [Hono](https://hono.dev/) on Cloudflare Workers
- **Image Processing**: WASM / [Photon](https://github.com/silvia-odwyer/photon) (via [`@cf-wasm/photon`](https://www.npmjs.com/package/@cf-wasm/photon))
- **Storage**: Cloudflare KV + R2
- **Monorepo**: [Turborepo](https://turbo.build/)
- **Package Manager**: pnpm

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) (via `corepack enable`)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) with `wrangler` authenticated (`pnpm wrangler:login`)
- A [GW2 API key](https://account.arena.net/applications) — set as `GW2_API_KEY` in `apps/service-api/wrangler.toml`

### Steps

1. Clone the repo.
2. Enable pnpm: `corepack enable`
3. Install dependencies: `pnpm install`
4. Authenticate with Cloudflare: `pnpm wrangler:login`
5. Run all services in parallel: `pnpm dev`

The three services will be available at:

- `http://localhost:3000` — Next.js frontend (`apps/gw2w2w`)
- `http://localhost:8787` — service-emblem
- `http://localhost:8788` — service-api

### Other useful commands

```sh
pnpm check-types   # TypeScript type checking across all packages
pnpm lint          # ESLint across all packages
pnpm format        # Prettier formatting
```

## Deployment

### Before you deploy

The Workers require a Cloudflare KV namespace and R2 bucket to exist before first deploy. Create them via the Cloudflare dashboard or `wrangler` CLI, then update the `id` / `bucket_name` values in each app's `wrangler.toml`.

### Deploy commands

```sh
pnpm deploy          # deploy all three workers
pnpm deploy:api      # deploy service-api only
pnpm deploy:emblem   # deploy service-emblem only
pnpm deploy:app      # deploy gw2w2w only
```
