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

### How Vite, React Router, and Cloudflare Fit Together

Three tools with distinct jobs: Vite builds, React Router routes and renders, Cloudflare runs and serves.

**Build.** Vite builds `src/` twice, once per [environment](https://vite.dev/guide/api-environment):

```
src/  ─┬─ client ──→ build/client/          browser JS/CSS + static assets
       └─ ssr    ──→ build/server/index.js   the Worker
```

`reactRouter()` configures both. Anything that must apply to only one is scoped by environment — the React Compiler runs on `client` only, because `react/compiler-runtime` reaches `useMemoCache` through React's _client_ internals dispatcher, which is null while server rendering.

**Request.** Cloudflare checks static assets before invoking any code:

```
request → Cloudflare edge
            ├── matches a file in build/client?  → served directly, Worker never invoked
            └── otherwise                        → workers/app.ts
```

That short-circuit is load-bearing rather than trivia: `/favicon.ico` is only reachable as a route because no `public/favicon.ico` exists. Adding that file would silently shadow the route.

**Render.** `workers/app.ts` does three things and then gets out of the way:

1. Installs the `Temporal` polyfill (absent from workerd) before any route module loads
2. Puts `env` and `ctx` into a `RouterContextProvider`
3. Hands the request to React Router's `createRequestHandler`

React Router matches against `src/routes.ts`, runs the matched `loader` server-side inside workerd, renders to HTML, and responds. Because loaders run there, `SERVICE_API` is a direct Worker-to-Worker call — the browser never talks to `api.gw2w2w.com`.

**Navigation.** The first load is a full document; client navigations after that fetch only loader data ([single fetch](https://reactrouter.com/start/framework/data-loading)):

| Request                | Response                                                   |
| ---------------------- | ---------------------------------------------------------- |
| `GET /guilds/:id`      | ~28 KB — full HTML, meta tags and content already rendered |
| `GET /guilds/:id.data` | ~360 B — loader data only, no document shell               |

Loaders also control the HTTP status through `data(value, { status })`. That is what lets a missing guild answer 404 and an upstream outage answer 503, instead of both rendering at 200.

**This is SSR with hydration, not React Server Components.** Every component ships to the browser, and the boundary is loader-vs-component rather than server-vs-client — `'use client'` carries no meaning here.

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
