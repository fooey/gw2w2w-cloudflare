# Project Context: gw2w2w-cloudflare

## Package Manager

This project uses **pnpm** (v11+). Always use `pnpx` instead of `npx` or `pnpm dlx` when running one-off executables — `pnpx` is pnpm's own long-standing `dlx` alias (not new to v11; only the even-shorter `pn`/`pnx` aliases were added in v11).

## Dependency Management

This repo uses **pnpm catalogs** for shared dependency versions. The catalog is defined in `pnpm-workspace.yaml`.

**When adding or updating a dependency that is already in the catalog**, use `"catalog:"` as the version in `package.json` — never hardcode the version string.

**When adding a new dependency that is used in 2 or more packages**, add it to the catalog in `pnpm-workspace.yaml` first, then reference it as `"catalog:"` in each `package.json`.

**To upgrade a cataloged dependency**, update the version in `pnpm-workspace.yaml` and run `pnpm install`. Do not update individual `package.json` files.

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

## Post-Change Verification

**After making any code changes, run the single verification script:**

```sh
pnpm format && pnpm ci:all
```

This formats all files, then runs all CI checks in order: format (verify) → lint (type-aware) → type-check → boundary-check → test. Fix any errors before finishing. Individual commands are also available as `ci:format`, `ci:lint`, `ci:types`, `ci:boundaries`, and `ci:test`. Individual commands are documented below for reference.

**For agents/CLI use, `pnpm ci:all:quiet` (and `pnpm ci:all:quiet-force`, the cache-bypassing equivalent of `ci:all:force`) run the identical pipeline but pass `--output-logs=errors-only` to the turbo-driven steps (`ci:lint`, `ci:types`, `ci:test`).** Passing packages are collapsed to the task-graph summary line instead of full streamed output; any failing package still prints its full log automatically. `ci:format` and `ci:boundaries` are already terse and unaffected by the flag. Prefer the quiet variant when you don't need to eyeball passing output, to keep verification runs out of the context window.

**A task is not complete until `pnpm ci:all` (or `ci:all:quiet`) reports a full clear signal.** Don't stop at "I ran it and saw some warnings" or "the failures are pre-existing" without re-confirming — re-run after every fix until every stage passes (or the only failure is a known, separately-tracked issue that the user has explicitly told you to ignore). Partial verification is not verification.

**`pnpm ci:all` doesn't cover every script.** Dev-utility scripts like `ts:clean` aren't wired into the CI pipeline. When you rename, remove, or re-alias a shared tool/binary, grep the affected `package.json`'s full `scripts` block for every reference to the old invocation, not just the ones `ci:all` exercises, and verify each one still resolves correctly.

## Preparing a PR

**`ci:audit` (`pnpm audit`) is deliberately not part of `ci:all`.** It's a different flavor of check than the rest of the pipeline — it hits the npm registry's audit endpoint over the network to check for security advisories, rather than validating anything in this codebase, and can fail on registry/network issues unrelated to your change. Before opening a PR, run it once alongside your final verification pass: `pnpm ci:all` (or `ci:all:quiet`) followed by `pnpm ci:audit`. CI also runs `ci:audit` as its own separate job on every PR, so this isn't your only safety net — it's just a chance to catch new advisories before they show up in review.

## Code Formatting

This repo uses Oxfmt (`oxfmt.json` covers formatting rules, Tailwind class sorting, and import sorting).

- **Format all files**: `pnpm format`
- **Check without writing**: `pnpm ci:format`

## Linting Configuration

Primary linting is OXC-based. See `linting.md` for the active lint architecture, preset ownership (`packages/oxlint-config`), JS plugin requirements, parity notes, and rule verification workflow.

## Type Checking

- **Check all packages**: `pnpm ci:types` (TypeScript 7's native `tsc`; `apps/gw2w2w` calls it via a `typescript7` alias — see `TODOS.md`)

## Package Boundaries

Architectural rules enforced across the monorepo:

- `app` packages (`gw2w2w`) — nothing may import them
- `service` packages (`service-api`, `service-emblem`) — cannot import `app` packages
- `library` packages (`emblem-renderer`, `utils`) — cannot import `app` packages

Do not suppress boundary violations — fix the dependency or the package tag.

- **Check boundaries**: `pnpm ci:boundaries`

## Testing

Tests use [Vitest](https://vitest.dev/). All Vitest CLI flags are available after the package filter.

- **Run all tests**: `pnpm ci:test`
- **Run tests for a specific package**: `pnpm --filter <package-name> test`
- **Run a specific test file**: `pnpm --filter <package-name> test <filename>`
- **Run tests matching a name**: `pnpm --filter <package-name> test -t "<test name>"`

If you add or change logic covered by tests, update the tests to match.

**Unit tests are guardrails for AI-agent-driven changes, not just QA — fast execution matters more than exhaustive coverage.** Default `environment` (`packages/vitest-config/base.config.ts`) is `node` for speed; add `// @vitest-environment happy-dom` as the first line of a specific test file only when it renders React components, rather than flipping the global default (a DOM environment costs roughly +300ms per test _file_, not per suite — confirmed empirically, since each file runs in its own forked VM under `pool: 'vmForks'`).

**Mocking:**

- Use `vi.*` (`vi.fn()`, `vi.spyOn()`), never `jest.*` — this is Vitest, not Jest.
- `restoreMocks: true` is set globally — mock call counts/implementations reset automatically before each test. Don't add manual `.mockClear()`/`.mockReset()` calls; they're redundant.

**Before writing a new test file**, check a sibling test file in the same directory (or the file being tested's nearest existing test) for established fixture and naming conventions — this repo does not use snapshot testing anywhere, and keeps test names as concise present-tense behavior statements (`'renders X'`, `'omits Y when Z'`) rather than `'should ... when ...'` phrasing.

**Component tests** using `@testing-library/react`: assert on rendered output (`getByText`, `getByRole`, attributes) a real user/consumer would observe, not on implementation details like internal state or which sub-function got called. Call `cleanup()` in `afterEach` (globals are not enabled, so import it explicitly from `@testing-library/react`).

## Documentation Maintenance

**Always keep `README.md` up to date.** When you add, remove, or significantly change a feature, architecture decision, or package, update the relevant sections of `README.md` in the same change. This includes:

- The **Features** list
- The **Architecture** diagram and tables
- The **Rendering Engine** section
- The **Key Design Decisions** section
- The **Tech Stack** section

**When renaming or removing a tool, package, or config knob** (not just adding a feature), grep `README.md` and every `AGENTS.md` in the repo — there's one per app/package in addition to this root one (`find . -iname AGENTS.md -not -path '*/node_modules/*'`) — plus other markdown docs, for the old name before considering the change complete. `pnpm ci:all` does not check prose documentation.

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

### Build ID Invalidation (`service-api`)

Static GW2 game data (colors, objectives, abilities, ranks, upgrades, emblem layers) is cached in R2 with a 30-day TTL (`CACHE_TTL.patch`). These collections are invalidated when ArenaNet releases a game patch.

**How it works:**

1. A Cron Trigger fires every 15 minutes (`*/15 * * * *`) and calls `checkBuildId` in `src/cron/buildWatcher.ts`
2. `checkBuildId` fetches `GET /v2/build` and compares the returned ID against `meta:build_id` in KV
3. If the ID changed: deletes all R2 keys in `STATIC_CACHE_KEYS`, updates the stored build ID, returns `true`
4. The `scheduled` handler in `src/index.ts` calls `ctx.waitUntil(warmStaticCaches(env))` when `true` is returned — re-fetching all collections fire-and-forget so no user ever sees a cold miss

**To add a new build-invalidated resource**, edit `src/cron/buildWatcher.ts` only:

- Add the R2 key string to `STATIC_CACHE_KEYS`
- Add the corresponding `(env) => getMyResource('all', env)` entry to `WARM_CACHE_FNS`
- Use `CACHE_TTL.patch` as the TTL in the resource's `withFilteredObjectCache` call

**To test locally:**

```
curl "http://localhost:8788/__scheduled?cron=*/15+*+*+*+*"
```

(Requires `--test-scheduled` flag in wrangler dev — already set in `package.json`)

### Cache Namespace Versioning

`withCache` in `apps/service-api/src/lib/cache-providers/cf-cache.ts` uses a **named Workers Cache** (`caches.open('service-api-v2')`). Named caches **cannot** be purged from the dashboard, API, or CLI — only from within the Worker via `cache.delete()`.

**When you change the JSON response shape of any cached route**, bump the version suffix (e.g. `service-api-v2` → `service-api-v3`). This instantly invalidates all stale entries across every Cloudflare colo.

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
