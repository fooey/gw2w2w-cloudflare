# gw2w2w.com

An open-source suite of Guild Wars 2 utilities, built on the Cloudflare edge.

## Features

- **Guild Emblem Hotlinks** — Serve rendered guild emblems directly as images by guild name or ID. Drop a URL into Discord, a forum, or any website. Hosted at `emblem.gw2w2w.com/<guildId>`.
- **Emblem Designer** — WIP: Interactive client-side editor to build and preview emblems from scratch using official ArenaNet assets.
- **WvW Objective Status** — WIP: Real-time World vs World objective tracking across all matchups.
- **WvW Teams** — Directory of which guilds belong to each WvW team.
- **Consistent Rendering** — The designer preview and the hotlink image use the same shared rendering engine, so what you see is what you get.

## Architecture

This is a Turborepo monorepo with three deployed Cloudflare Workers and a shared internal package library.

### Applications

| App                   | Domain              | Description                                                      |
| --------------------- | ------------------- | ---------------------------------------------------------------- |
| `apps/gw2w2w`         | `gw2w2w.com`        | Next.js 15 frontend, deployed via OpenNext on Cloudflare Workers |
| `apps/service-emblem` | `emblem.gw2w2w.com` | Hono Worker — renders guild emblems as PNG, caches in R2         |
| `apps/service-api`    | `api.gw2w2w.com`    | Hono Worker — GW2 API proxy with KV + R2 tiered caching          |

### Packages

| Package                      | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `packages/emblem-renderer`   | Shared emblem rendering logic (WASM / Photon)    |
| `packages/utils`             | Shared routing, validation, and string utilities |
| `packages/eslint-config`     | Shared ESLint configuration                      |
| `packages/typescript-config` | Shared TypeScript configuration                  |

### Rendering Engine

ArenaNet's API provides emblem layers as grayscale textures. Each layer is colorized by treating its texture channel as an opacity mask for a flat GW2 palette color, then alpha-composited together in layer order using a Porter-Duff "over" operation implemented via direct pixel manipulation. The [Photon](https://github.com/silvia-odwyer/photon) WASM library (via the Cloudflare-compatible [`@cf-wasm/photon`](https://www.npmjs.com/package/@cf-wasm/photon) build) is used for image decoding and flip transforms.

The same `emblem-renderer` package is used by both `service-emblem` (server-side PNG generation) and the browser-based Designer (client-side preview), guaranteeing pixel-perfect parity.

### Caching Strategy

`service-api` uses a two-tier cache to minimize GW2 API calls:

1. **Cloudflare KV** — Fast, globally-replicated cache for API responses.
2. **Cloudflare R2** — Persistent object storage for raw textures and rendered emblem PNGs, so each unique emblem is rendered only once.

## Tech Stack

- **Frontend**: Next.js 15 + React 19, deployed via [@opennextjs/cloudflare](https://github.com/opennextjs/opennextjs-cloudflare)
- **API / Workers**: [Hono](https://hono.dev/) on Cloudflare Workers
- **Image Processing**: WASM / [Photon](https://github.com/silvia-odwyer/photon) (via [`@cf-wasm/photon`](https://www.npmjs.com/package/@cf-wasm/photon))
- **Storage**: Cloudflare KV + R2
- **Monorepo**: [Turborepo](https://turbo.build/)
- **Package Manager**: pnpm

## Local Development

1. Clone the repo.
2. Enable pnpm: `corepack enable`
3. Install dependencies: `pnpm install`
4. Run all services in parallel: `pnpm dev`

> Workers run locally via `wrangler dev`. The Next.js app runs via `next dev`.

## Deployment

```sh
pnpm deploy          # deploy all three workers
pnpm deploy:api      # deploy service-api only
pnpm deploy:emblem   # deploy service-emblem only
pnpm deploy:app      # deploy gw2w2w only
```
