# Contributing

Thanks for your interest in contributing to gw2w2w.com!

## Prerequisites

- [Node.js](https://nodejs.org/) 24+
- [pnpm](https://pnpm.io/) — enable via `corepack enable`
- A [GW2 API key](https://account.arena.net/applications) — the setup script will scaffold a placeholder you'll need to fill in

A Cloudflare account is **not** required for local development. Wrangler simulates KV, R2, D1, and Durable Objects locally in `.wrangler/state/`. A Cloudflare account is only needed to deploy to production or use `pnpm tail`.

## Local Development

### First-time setup

These steps are only needed once after cloning.

**1. Install dependencies**

```sh
corepack enable
pnpm install
```

**2. Run the setup script**

```sh
pnpm setup:dev
```

This will:

- Scaffold `apps/service-api/.dev.vars` with a placeholder `GW2_API_KEY` if it doesn't exist
- Apply D1 migrations to the local wrangler simulation database

Get a GW2 API key at [account.arena.net/applications](https://account.arena.net/applications) and fill it in to `apps/service-api/.dev.vars`.

**3. Authenticate with Cloudflare** _(deployment only, not required for local dev)_

```sh
pnpm wrangler:login
```

### Running locally

```sh
pnpm dev
```

This starts all three services in parallel and automatically runs `dev:seed`, which polls `service-api` until it's ready and then triggers the scheduled handler to bootstrap the `MatchupPoller` Durable Object. Without this, the WvW pages will load but show no live data until the first cron tick (up to 15 minutes).

The three services start at:

- `http://localhost:3000` — Next.js frontend
- `http://localhost:8787` — service-emblem
- `http://localhost:8788` — service-api

## Before Opening a PR

All of the following must pass locally:

```sh
pnpm format          # auto-fix formatting
pnpm check-types     # TypeScript across all packages
pnpm lint            # ESLint across all packages
pnpm check-boundaries # package import rules
```

CI runs all four checks on every PR. PRs with failing checks will not be merged.

## Package Manager

This project uses **pnpm** (v11+). Do not use `npm` or `yarn`. Use `pnpx` instead of `npx` or `pnpm dlx` for one-off executables — `pnpx` is pnpm's own long-standing `dlx` alias (not new to v11; only the even-shorter `pn`/`pnx` aliases were added in v11).

Shared dependency versions live in the `catalog` in `pnpm-workspace.yaml`. When adding a dependency already in the catalog, reference it as `"catalog:"` in `package.json` rather than hardcoding the version.

## Code Style

- **TypeScript** — strict mode, no `any`
- **React** — React 19 + React Compiler enabled. No `useMemo`, `useCallback`, or `React.memo()` — the compiler handles memoization automatically
- **Formatting** — Oxfmt (handles Tailwind class sorting and import sorting natively). Run `pnpm format` after every change
- **Tailwind CSS v4** — utility classes only, no custom CSS unless absolutely necessary

## Submitting Changes

1. Fork the repo and create a branch from `main`
2. Make your changes, ensuring all checks pass
3. Open a pull request against `main` with a clear description of what changed and why

## Questions

Open a [Discussion](https://github.com/fooey/gw2w2w-cloudflare/discussions) for anything that isn't a bug or feature request.
