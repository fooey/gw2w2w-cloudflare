# Project Context: gw2w2w-cloudflare

## Package Manager

This project uses **pnpm**. Always use `pnpm dlx` instead of `npx` when running one-off executables.

## React Compiler

**React 19 / React Compiler System Instructions:**

You are assisting with a React application that has the **React Compiler fully enabled**. Your mental model for React performance optimization must shift to the compiler paradigm.

Adhere to the following rules strictly:

1. **NO MANUAL MEMOIZATION:** Do NOT use, suggest, or write `useMemo`, `useCallback`, or `React.memo()`. The compiler handles all dependency tracking and memoization at the component and hook level automatically. Assume all valid React code is highly optimized by default.
2. **RULES OF REACT ARE CRITICAL:** The compiler will silently bail out if the Rules of React are broken. You must be hyper-vigilant about:
   - Never mutating props or state directly.
   - Keeping render functions entirely pure (no side effects).
   - Calling hooks unconditionally at the top level.
3. **CLEAN CODE OVER PREMATURE OPTIMIZATION:** Write standard, readable, idiomatic JavaScript. Do not create intermediary variables or abstract functions solely for the sake of "performance" or "reference stability." The compiler will handle reference stability.
4. **OPT-OUT DIRECTIVE:** If there is a highly specific, proven edge case where the compiler is breaking third-party integration or causing an issue, you may use the `"use no memo"` directive at the top of a component or hook to opt it out of compilation. Explain exactly why you are opting out if you do so.

## Code Formatting

**Always run `pnpm format` after making code changes.** This repo uses Prettier with `prettier-plugin-tailwindcss` for consistent formatting across all `.ts`, `.tsx`, `.md`, `.json`, and other source files.

- **Format all files**: `pnpm format`
- **Check without writing**: `pnpm format:check`

Run `pnpm format` on every file you create or modify before considering a task complete. Never leave formatting as a manual follow-up step.

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
| `apps/gw2w2w`         | `gw2w2w.com`        | Next.js 16 via OpenNext on Cloudflare Workers | 3000 |
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
- **Frontend**: Next.js 16 + React 19, Tailwind CSS v4, deployed via `@opennextjs/cloudflare`
- **Backend**: Hono (two Workers: `service-emblem`, `service-api`)
- **Storage**: Cloudflare R2 (`EMBLEM_ASSETS` bucket — textures, rendered emblems), Cloudflare KV (`EMBLEM_ENGINE_GUILD_LOOKUP` — guild name→id mappings)
- **Server rendering**: `@cf-wasm/photon` (Cloudflare Workers-only) for PNG decode, flip transforms, WebP encode
- **Browser rendering**: `@silvia-odwyer/photon` WASM for PNG decode and flip transforms in the designer
- **Worker-to-Worker**: Cloudflare Service Bindings + Hono RPC (type-safe, zero network hop)

## Core Rendering Logic

The compositing pipeline is split by platform:

- **`packages/emblem-renderer/pixels.ts`** — Platform-independent. Takes pre-decoded `DecodedLayer` objects (`Uint32Array` pixel buffers) and `ColorRGB` options. Single-pass Porter-Duff "over" compositing loop. Supports isolated layer rendering (bg-only, fg-only, etc.).
- **`packages/emblem-renderer/index.ts`** — Server only. Uses Photon WASM to decode PNGs and apply flip transforms, calls `pixels.ts` to composite, returns a `PhotonImage` for WebP encoding.
- **`apps/gw2w2w/src/lib/ui/designer/EmblemPreview/decodeLayer.ts`** — Browser only. Uses `@silvia-odwyer/photon` WASM (via `TextureCacheManager/photon.ts`) to decode PNGs and apply flip transforms, returns a `DecodedLayer` for `pixels.ts`.

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

## ESLint Config Structure

Configs live in `packages/eslint-config/`. All packages extend `base.ts` either directly or via the React/Next wrappers.

```
base.ts              → strictTypeChecked + stylisticTypeChecked + turbo + prettier
react-internal.ts    → base + @eslint-react recommended-type-checked + browser globals
next.ts              → base + @eslint-react + @next/eslint-plugin-next + serviceworker+browser globals
```

**Key rules:**

- `@typescript-eslint/consistent-type-imports` — enforces `import type` inline style
- `@typescript-eslint/no-non-null-assertion` — forbids `!` assertions; use `as Type` instead
- `@typescript-eslint/non-nullable-type-assertion-style` — disabled (conflicts with above)
- `turbo/no-undeclared-env-vars` — warns on env vars not declared in `turbo.json`
- `no-console` — warns except for `console.info`, `console.warn`, `console.error`

**Do not re-spread** `tseslint.configs.recommended`, `js.configs.recommended`, or `eslintConfigPrettier` in `react-internal.ts` or `next.ts`. They already come in via `baseConfig`. Re-spreading silently downgrades `strictTypeChecked` rules since later flat-config entries win on conflicts.
