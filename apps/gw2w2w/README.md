# gw2w2w

[React Router v8](https://reactrouter.com/) frontend for [gw2w2w.com](https://gw2w2w.com), built with Vite. Guild Wars 2 utilities including guild emblem rendering, an interactive emblem designer, and real-time WvW match tracking.

Runs directly on Cloudflare Workers — the dev server executes the SSR bundle inside workerd via [`@cloudflare/vite-plugin`](https://developers.cloudflare.com/workers/vite-plugin/), so local development uses the same runtime and bindings as production.

**Production:** `gw2w2w.com`

## Local Development

```sh
pnpm dev       # Vite dev server on port 3000 (SSR runs in workerd)
pnpm preview   # builds, then serves the production bundle in workerd
```

Requires `service-api` running on port 8788 for API calls during development.

`pnpm preview` is worth using before a deploy: it sets `import.meta.env.PROD`, which switches the API client onto the `SERVICE_API` service binding — the code path `pnpm dev` never exercises.

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

Route modules live in `src/routes/` and are declared in `src/routes.ts`; `src/root.tsx` is the document shell and `workers/app.ts` is the Worker entry. Route modules are kept thin — loaders fetch data and the component composes UI, with minimal markup. All substantive UI lives in `src/ui/` (shared components) and `src/lib/ui/` (feature-specific components).

Cloudflare bindings reach loaders and actions through the typed load context rather than an ambient accessor:

```ts
export async function loader({ context }: Route.LoaderArgs) {
  const api = getApi(context.get(cloudflareContext).env);
}
```

### Cloudflare Bindings

| Binding                      | Type    | Purpose                             |
| ---------------------------- | ------- | ----------------------------------- |
| `SERVICE_API`                | Service | Bound to `service-api` Worker       |
| `SERVICE_EMBLEM`             | Service | Bound to `service-emblem` Worker    |
| `WORKER_SELF_REFERENCE`      | Service | Self-reference for internal routing |
| `EMBLEM_ASSETS`              | R2      | Cached GW2 render textures          |
| `EMBLEM_ENGINE_GUILD_LOOKUP` | KV      | Guild emblem spec cache             |

Static assets are served from the Vite client build (`build/client`), configured via `[assets]` in `wrangler.toml`.

### Key Tech

- **React Router v8** in framework mode — SSR with per-route loaders and generated route types
- **Vite 8** with **React Compiler** via [`oxc-transform-react`](https://www.npmjs.com/package/oxc-transform-react) (the Rust port, no Babel) — no manual memoization
- **Tailwind CSS v4** via `@tailwindcss/vite`
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
