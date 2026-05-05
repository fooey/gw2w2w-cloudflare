# gw2w2w

Next.js 16 frontend for [gw2w2w.com](https://gw2w2w.com). Guild Wars 2 utilities including guild emblem rendering, an interactive emblem designer, and real-time WvW match tracking.

Deployed on Cloudflare Workers via [OpenNext](https://opennext.js.org/).

**Production:** `gw2w2w.com`

## Local Development

```sh
pnpm dev       # starts Next.js on port 3000
pnpm preview   # builds and previews via OpenNext/Cloudflare locally
```

Requires `service-api` running on port 8788 for API calls during development.

## Features

### Guild Emblem Hotlinks

Look up any guild by name or ID.

- `/guilds` — guild search + demo guild list
- `/guilds/:guildId` — guild detail with emblem, metadata, and designer link

### Emblem Designer

Interactive client-side emblem builder with color pickers, layer selectors, and live preview.

- `/designer` — full emblem editor with URL state serialization (shareable `?s=` shortlinks)
- Uses Photon WASM for client-side image compositing

### WvW Match Tracker

Real-time WvW objective tracking with SSE updates.

- `/wvw/matchups` — dashboard of all active matches
- `/wvw/matchups/:slug` — live match view with objective maps, score tracking, event logs, and guild activity charts

### API Routes

| Route          | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `/api/texture` | Proxies GW2 render textures via R2 cache (SSRF-safe) |
| `/api/version` | Returns current build hash                           |

## Architecture

### Project Structure

Route files (`src/app/**/page.tsx`, `layout.tsx`) are kept thin — they handle data fetching and compose components but contain minimal UI markup. All substantive UI lives in `src/ui/` (shared components) and `src/lib/ui/` (feature-specific components).

### Cloudflare Bindings

| Binding                      | Type    | Purpose                             |
| ---------------------------- | ------- | ----------------------------------- |
| `SERVICE_API`                | Service | Bound to `service-api` Worker       |
| `SERVICE_EMBLEM`             | Service | Bound to `service-emblem` Worker    |
| `WORKER_SELF_REFERENCE`      | Service | Self-reference for internal routing |
| `EMBLEM_ASSETS`              | R2      | Cached GW2 render textures          |
| `EMBLEM_ENGINE_GUILD_LOOKUP` | KV      | Guild emblem spec cache             |
| `ASSETS`                     | Assets  | Static assets from OpenNext build   |

### Key Tech

- **React 19** with **React Compiler** enabled — no manual memoization
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **TanStack Query** for client-side data fetching
- **Zustand** for client-side state (user preferences, clock)
- **Recharts** for WvW activity charts
- **Photon WASM** for client-side emblem compositing

### SSE Integration

`useMatchSSE` hook connects to `service-api`'s `/wvw/stream` endpoint via `EventSource`. Handles `matchState`, `capture`, and `claim` events to update live match views.

## Testing

```sh
pnpm test         # run once
pnpm test:watch   # watch mode
```
