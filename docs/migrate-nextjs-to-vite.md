# Migrating gw2w2w from Next.js to Vite + React Router

Record of the port of `apps/gw2w2w` off Next.js 16 / OpenNext onto React Router v8 in framework mode, bundled by Vite 8 and running natively on Cloudflare Workers. Covers what changed, why each decision went the way it did, the traps worth knowing, and what was measured rather than assumed.

---

## Why

The trigger was wanting oxc's Rust React Compiler. Next runs React Compiler through Babel and its own docs concede that is slower than its default Rust pipeline; there was no way to opt into the oxc implementation while staying on Next.

Pulling that thread exposed a bigger mismatch. The app used almost none of what makes Next expensive:

- no `next/image` (zero call sites)
- no ISR, no PPR, no middleware
- one trivial server action, which only computed a redirect URL
- one `generateMetadata`
- **13** `next/*` import sites in total, across 8 routes

Meanwhile it paid the full Next complexity budget _plus_ OpenNext as a translation layer. The rest of the monorepo (`service-api`, `service-emblem`) is plain Workers; `gw2w2w` was the one package that needed an adapter to become a Worker. The repo is also already all-in on oxc — `oxlint`, `oxfmt`, `oxlint-tsgolint` — and Vite 8 runs on rolldown/oxc, while Next uses SWC.

Two arguments carried the decision:

1. **Dev/prod fidelity.** `next dev` ran in Node; production ran in workerd through OpenNext. Now `@cloudflare/vite-plugin` runs SSR _inside workerd_ in dev, with real bindings. The `instrumentation.ts` Temporal polyfill existed precisely because Node has `Temporal` and workerd does not — that class of divergence is gone.
2. **One less translation layer.** `main` is now `workers/app.ts`, a Worker you can read top to bottom.

---

## Key decisions

### React Router v8, not TanStack Start

TanStack Start was a genuine contender: the repo already uses TanStack Query, and TanStack Router's type-safe search params would have directly targeted `EmblemDesigner`, which is a nine-param URL state machine with a hand-rolled shortlink codec.

React Router won on risk. It is a settled stable major with a Cloudflare-maintained template; TanStack Start was still on an RC line. For a live site, that mattered more than search-param ergonomics.

### Framework mode, not declarative or data mode

Only framework mode replaces what Next was doing. Declarative mode (v5-style) has no data APIs and would have made this a SPA, losing SSR'd metadata. Data mode gives loaders but leaves you to hand-roll SSR and the build. Framework mode supplies `routes.ts`, server loaders, generated route types, and — critically — a Worker server build that `@cloudflare/vite-plugin` runs in workerd, which is what lets loaders reach the `SERVICE_API` service binding.

### Stable framework mode, not RSC

React Router v8 supports RSC, which would have preserved the async-server-component model almost intact. It is flagged **experimental, with breaking changes possible in patch releases**, and both upstream templates are `unstable_`-prefixed. Not a foundation for a production site. Async server components became loaders instead.

### Keep the `src/` layout

`react-router.config.ts` sets `appDirectory: 'src'` rather than adopting the default `app/`, so the `#*` subpath imports in `package.json` keep resolving unchanged. That alone avoided touching every import in the app.

### Keep the `Link` wrapper's `href` prop

`src/ui/Link.tsx` was already a wrapper around `next/link`, so the swap stayed contained to one file. React Router's `Link` takes `to`; the wrapper keeps accepting `href` so ~40 call sites were untouched. It also detects absolute/external URLs and renders a plain `<a>` — `SiteNav` routes external GitHub links through the same component.

### `prefetch="intent"` as the default

Next's viewport-based prefetching was considered too aggressive — it fetched every link in view. `intent` preloads the route module and loader data on hover/focus, so navigation feels instant without speculatively hitting `service-api` for links nobody clicks.

### Dropped the `/wvw/teams` routes

Both route files did nothing but call `notFound()`. Unmatched URLs now render the same 404 through the root `ErrorBoundary`, so the behaviour is identical with two fewer files.

### `guild-search` as a real POST route

The Next `'use server'` action only computed a redirect. It could have become an `onSubmit` handler, but it is a route action at `/guild-search` so the search box still works without JS. It is deliberately **not** under `/guilds/*` — `guilds/search` would shadow a guild actually named "search" on `guilds/:guildId`.

---

## Traps

The parts that were non-obvious, and would cost time to rediscover.

### `instrumentation.ts` was load-bearing and nearly invisible

Next's instrumentation hook installed the `@js-temporal/polyfill`. **17 files** use `Temporal`, and under React Router those components server-render exactly as they did under Next — so workerd needs the global. Vite has no equivalent hook, so it is installed at the top of `workers/app.ts`, the only module guaranteed to run before any route. Missing this would have been a production crash, not a build error.

### Cloudflare's template is a version behind

React Router v8 changed two APIs that the official Cloudflare template (still on v7) gets wrong:

- **Load context**: v7's ambient `AppLoadContext` interface-merging is replaced by a typed `RouterContextProvider`. Bindings now arrive via `context.get(cloudflareContext)`, and `getApi(env)` takes the env explicitly.
- **Meta args**: `data` became `loaderData`.

The template's `future.unstable_viteEnvironmentApi` flag also no longer exists in v8's `FutureConfig`. Copying it verbatim fails.

### React Compiler breaks SSR unless scoped to the client

With the compiler applied to both environments, every compiled component threw during server rendering:

```
TypeError: Cannot read properties of null (reading 'useMemoCache')
```

`react/compiler-runtime` reaches `useMemoCache` through React's **client** internals dispatcher, which is null while server rendering. Fixed by scoping the plugin with `applyToEnvironment: (e) => e.name === 'client'`. This costs nothing real: memoization only pays off across client re-renders, SSR is a single pass, and the emitted HTML is identical, so hydration is unaffected.

### `href()` percent-encodes for you

React Router's `href()` encodes path params itself (via `encodePathParam`). Five call sites were already calling `encodeURIComponent`, which would have **double-encoded** — breaking any guild name containing a space. Pass raw values.

### `"type": "module"` is required

Without it Vite loads `vite.config.ts` through CJS `require`, and `@cloudflare/vite-plugin` (ESM-only) fails to resolve. Next never needed this.

### `next/font` was dead code

`layout.tsx` loaded Geist and Geist Mono, but the `@theme inline` block mapping `--font-sans` → `--font-geist-sans` is **commented out** in `globals.css`. The fonts were downloaded and never applied. Dropping `next/font` was behaviourally neutral and removed two unused webfont families.

### Editing `vite.config.ts` invalidates the dep cache

Any config change forces a full dependency re-optimization across **both** environments, and Vite hard-reloads the page when the optimized set changes. Expect one slow start after touching the config — it is not a regression.

### Dev servers bind different IP stacks

Vite binds IPv6 (`::1`) by default on Windows; `wrangler dev` binds IPv4 (`127.0.0.1`). A browser resolving `localhost` to both stalls ~2s on a dead connection before falling back. Symptoms look like slow rendering but the server responds in ~20ms — a HAR showed `connect: 2037ms` against `wait: 20ms`. Fixed with `server.host: '::'` in `vite.config.ts` and by pointing `EMBLEM_HOST_DEVELOPMENT` at `127.0.0.1:8787`.

### Route-level deps are discovered late

React Router lazy-loads route modules, so Vite's startup scan cannot see deps only a route imports. They are discovered as you browse, and each newly-optimized batch forces a full page reload. `optimizeDeps.include` in `vite.config.ts` pre-bundles them.

---

## Knock-on cleanups

Removing Next made three unrelated workarounds obsolete:

- **The TypeScript 7 alias.** `apps/gw2w2w` pinned `typescript` to `@typescript/typescript6` and aliased the real compiler as `typescript7`, purely because Next 16's `verify-typescript-setup.js` probed for `typescript/lib/typescript.js`. The app now uses `typescript: catalog:` and plain `tsc` like every other package.
- **Two pnpm overrides.** `qs` and `form-data` existed only for `@opennextjs/*` transitive deps; neither package is in the tree any more. `esbuild`/`postcss` overrides remain (Vite/Tailwind still pull them).
- **A `next` dependency in `packages/typescript-config`**, which kept Next installed even after the app dropped it, alongside a `nextjs.json` preset nothing extended.

Also: Tailwind moved from `@tailwindcss/postcss` to `@tailwindcss/vite` (PostCSS config deleted), and `NEXT_PUBLIC_*` build stamps became `import.meta.env.VITE_*` injected via `define`.

---

## Toolchain updates that rode along

- **pnpm 11.13.0 → 11.25.0.** Not migration-related: upstream marked 11.13.0 a broken release (`@pnpm/exe` shipped without a binary), so CI could not install it. Pre-existing on `main`; this branch was simply the first thing to run CI afterwards.
- **Vite 8.1.4 → 8.2.2, Tailwind 4.3.2 → 4.3.3.** Patch/minor. The Tailwind bump aligns it with `@tailwindcss/vite`, which was added at 4.3.3.
- **oxfmt 0.58.0 → 0.66.0.** Its only effect on this repo was reformatting the two generated `cloudflare-env.d.ts` files — which is exactly why those are now in `ignorePatterns` (see below).
- **oxlint 1.73.0 → 1.81.0 and oxlint-tsgolint 0.24.0 → 7.0.2001.** tsgolint's version jump is a renumbering, not seven majors: it now tracks the typescript-go version it embeds. It moves with oxlint because oxlint invokes it for type-aware rules.

### The `react/react-compiler` rule was split

Directly relevant to this port. oxlint 1.81 removed the single `react/react-compiler` rule and replaced it with ~23 granular rules named after React Compiler's own validation passes — `react/purity`, `react/immutability`, `react/preserve-manual-memoization`, `react/set-state-in-render`, `react/incompatible-library`, `react/exhaustive-effect-dependencies`, and so on. They are enabled by the categories in `base.json`, so no explicit rule entry is needed.

Two consequences worth knowing:

- Suppressions must use the new rule name, and the granular rules report at a **different location** than the old one — `exhaustive-effect-dependencies` reports on the dependency array, so `eslint-disable-next-line` has to sit immediately above `}, [deps]);` rather than above the hook.
- The finer rules surfaced diagnostics the monolithic one did not. One was a real redundant dependency (`flagKey` in `EmblemPreview`, already covered by the individual flip flags it derives from). Another was a **false positive in spirit**: `size` in `GuildEmblemUsage` is a deliberate trigger dependency — the effect never reads it, but removing it would leave the scroll firing only on mount. That one is suppressed with an explanation rather than "fixed".

`eslint(one-var)` is disabled in `base.json`: it is enabled by the `style` category in 1.81 and produced 351 findings asking for consecutive declarations to be merged.

### Generated type files are no longer formatted

`**/cloudflare-env.d.ts` is in `ignorePatterns` for both oxfmt and oxlint. Wrangler rewrites those files wholesale on every `cf-typegen` (~28k lines across the two apps), so formatting them only creates churn the next regeneration undoes. They were regenerated here so the committed content matches raw generator output, making future `cf-typegen` runs a no-op. Hand-written ambient files such as `src/vite-env.d.ts` are still linted and formatted.

---

## What we gave up

Worth stating plainly — the port was not purely additive.

- **Server components.** Async components that fetched and rendered as one unit became loaders plus components. A real expressiveness downgrade.
- **`loading.tsx` and `error.tsx` conventions.** Next provided route-transition UI and per-route error boundaries implicitly. React Router makes both explicit, so they had to be rebuilt: `src/ui/NavigationProgress.tsx` and a route-scoped `ErrorBoundary` in `matchup-detail.tsx`.
- **Ecosystem depth.** React Router v8 is new enough that Cloudflare's own template is wrong in two places.

---

## Measurements

Dev server startup, isolated by plugin:

| Config                                    | Time to ready |
| ----------------------------------------- | ------------- |
| Bare Vite, no plugins                     | 641ms         |
| \+ Tailwind, React Compiler, React Router | 963ms         |
| \+ `@cloudflare/vite-plugin` (workerd)    | **8520ms**    |

Roughly 88% of startup is workerd booting. Cold start with the dependency cache deleted (9.2s) is within noise of warm (8.8s), so the dep optimizer is **not** the bottleneck — this is a fixed cost paid on every start, and it is the price of running dev SSR in the real runtime.

Other numbers:

- First request ~1.6s (cold module transform), subsequent requests **64–70ms**
- Production build **~2.7s** total (client 714ms + SSR 572ms)
- `matchup-detail` client chunk **444KB → 84KB** after lazy-loading `recharts` behind `Suspense` (it is used by exactly one component, `EventActivityChart`)
- Server bundle **2326KB → 1409KB** (gzip 493KB → 296KB)
- Deploy payload **2784 KiB / 591 KiB gzipped**, against a 10MB limit
- **276 packages** removed when `next` + `@opennextjs/cloudflare` came out

> A "2+ minute cold start" figure was reported early in this migration. It was **wrong** — a benchmark bug (grepping for a literal `Local:` fails because Vite colorizes it as `Local\e[22m:`, so ANSI must be stripped) compounded by contention from stray dev servers. Do not repeat it.

---

## Verification

What was actually exercised, not assumed:

- `pnpm run ci:all` — format, lint, types, boundaries, 93 app tests
- `pnpm run preview` runs the production build in workerd with `import.meta.env.PROD` set, which switches the API client onto the `env.SERVICE_API` **service binding** — the branch `pnpm dev` never executes. `/wvw/matchups` rendered real match data through it.
- `wrangler deploy --dry-run` resolves all bindings. Note it follows `.wrangler/deploy/config.json`, a redirect the Vite plugin writes so plain `wrangler deploy` picks up the built output rather than re-bundling source.
- Temporal-dependent SSR components render, confirming the polyfill relocation works in workerd.

**Not verified:** service-binding _resolution_ in production. Locally, miniflare resolves `SERVICE_API` through wrangler's dev registry; in production it routes to the deployed Worker. The code path is proven, the resolution mechanism is not. Only a real deploy closes that.

---

## Follow-ups

- `shouldRevalidate` to skip redundant loader runs on navigation within the matchups layout
- The matchup `.data` payload is ~21KB; worth trimming at the API level
- TanStack Router's type-safe search params remain the strongest unexploited win for `EmblemDesigner`
- React Router RSC, once it leaves experimental, would restore the server-component model
