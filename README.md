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

The renderer is designed to operate within Cloudflare Workers' **50ms CPU time limit**, so performance was paramount: the compositing loop runs over raw `Uint32Array` pixel buffers in a single pass, avoiding any intermediate allocations or redundant traversals.

The same `emblem-renderer` package is used by both `service-emblem` (server-side WebP generation) and the browser-based Designer (client-side preview), guaranteeing pixel-perfect parity between the designer preview and the final rendered image.

### Caching Strategy

`service-api` uses a two-tier cache to minimize GW2 API calls:

1. **Cloudflare KV** — Fast, globally-replicated cache for API responses.
2. **Cloudflare R2** — Persistent object storage for raw textures and rendered emblem images, so each unique emblem is rendered only once.

## Tech Stack

### Platform

- **[Cloudflare Workers](https://workers.cloudflare.com/)** — Serverless edge runtime. All three services run as Workers, executing at the data center closest to the user with no cold-start penalty and no servers to manage.
- **Cloudflare KV + R2** — KV provides fast globally-replicated key-value storage for API response caching; R2 provides S3-compatible object storage for raw textures and rendered emblems with no egress fees.

### Frontend

- **[Next.js 15](https://nextjs.org/) + [React 19](https://react.dev/)** — Frontend framework. Deployed to Cloudflare Workers via [@opennextjs/cloudflare](https://github.com/opennextjs/opennextjs-cloudflare), which adapts Next.js to run without Node.js.
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS framework.
- **[Headless UI](https://headlessui.com/) + [Heroicons](https://heroicons.com/)** — Accessible UI components and icons.

### Backend / Workers

- **[Hono](https://hono.dev/)** — HTTP framework for the two API Workers. Chosen for its tiny footprint (~14kb), zero dependencies, and first-class Cloudflare Workers support — critical when every byte counts in a Worker bundle.
- **WASM / [Photon](https://github.com/silvia-odwyer/photon)** (via [`@cf-wasm/photon`](https://www.npmjs.com/package/@cf-wasm/photon)) — Image processing. Photon is a lightweight Rust/WASM library used for image decoding and pixel transforms. The `@cf-wasm/photon` build is pre-optimized for the Cloudflare Workers runtime.

### Shared / Utilities

- **[Zod](https://zod.dev/)** — Runtime schema validation used across the stack: API request parameters in Workers and form/data validation in the frontend.
- **[lodash-es](https://lodash.com/)** — ES module build of Lodash for tree-shakeable utility functions.

### Tooling

- **[Turborepo](https://turbo.build/)** — Monorepo build system with intelligent task caching. Ensures only affected packages rebuild on change.
- **[pnpm](https://pnpm.io/)** — Package manager. Uses a content-addressable store and hard links to avoid duplicating packages on disk, making installs significantly faster and lighter than npm or yarn, especially in a monorepo.
- **[TypeScript](https://www.typescriptlang.org/)** — Used across all apps and packages with strict shared configs via `packages/typescript-config`.
- **[ESLint](https://eslint.org/) + [Prettier](https://prettier.io/)** — Linting and formatting enforced across the monorepo via shared configs in `packages/eslint-config`.

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
