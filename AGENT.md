# Project Context: GW2 Emblem Service

## Overview

A high-performance Guild Wars 2 emblem rendering service and interactive designer.

- **Hotlink Service**: Serves dynamic PNGs via `domain.com/emblem/{guildId}.png`.
- **Designer**: A React-based UI for real-time emblem creation.

## Tech Stack

- **Monorepo**: Turborepo + pnpm.
- **Frontend**: Next.js (deployed to Cloudflare Pages).
- **Backend**: Cloudflare Workers (Image Hotlinking).
- **Storage**: Cloudflare R2 (Static assets & rendered results).
- **Cache**: Cloudflare Cache API (Tier 1) and R2 (Tier 2).
- **Rendering Engine**: Shared WASM module using `@cf-wasm/photon`.

## Core Rendering Logic

- **Shared WASM**: The same `renderer` package is used by both the Worker (server-side) and Next.js (client-side preview).
- **Multiply Blend**: Colors from the `/v2/colors` API are applied to grayscale textures using the "multiply" blend mode.
- **Layer Stacking**:
  - Background: Index 0.
  - Foreground: Skip Index 0 (composite); Use Index 1 (Primary) and Index 2 (Secondary).
- **Transformations**: Handle `FlipBackgroundHorizontal`, `FlipForegroundHorizontal`, etc., using Photon's `fliph` and `flipv`.

## Caching Strategy (Pull-Through)

1. **Cache API**: Local data center check (0ms CPU).
2. **R2 Storage**: Global persistent check. If found, stream to user and back-fill Cache API.
3. **WASM Render**: If R2 is empty, fetch metadata/textures, render via Photon, and save to R2 via `ctx.waitUntil`.

## Invalidation

- **Global Purge**: Uses Cloudflare API to invalidate specific URLs globally across all data centers for the "Refresh" button.

## API Endpoints

### Resources

- **Foregrounds**
  - Docs: https://wiki.guildwars2.com/wiki/API:2/emblem/foregrounds
  - Endpoint: `https://api.guildwars2.com/v2/emblem/foregrounds?ids=all`
- **Backgrounds**
  - Docs: https://wiki.guildwars2.com/wiki/API:2/emblem/backgrounds
  - Endpoint: `https://api.guildwars2.com/v2/emblem/backgrounds?ids=all`
- **Colors**
  - Docs: https://wiki.guildwars2.com/wiki/API:2/colors
  - Endpoint: `https://api.guildwars2.com/v2/colors?ids=all`

### Guilds

- **Search**
  - Docs: https://wiki.guildwars2.com/wiki/API:2/guild/search
  - Endpoint: `https://api.guildwars2.com/v2/guild/search?name=[name]`
- **Details**
  - Docs: https://wiki.guildwars2.com/wiki/API:2/guild/:id
  - Endpoint: `https://api.guildwars2.com/v2/guild/[id]`

### General Documentation

- Main API: https://wiki.guildwars2.com/wiki/API:Main
- Emblem Overview: https://wiki.guildwars2.com/wiki/API:2/emblem
