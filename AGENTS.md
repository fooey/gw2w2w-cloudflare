# Project Context: gw2w2w-cloudflare

## Package Manager

This project uses **pnpm** (v11+). Always use `pnpx` instead of `npx` or `pnpm dlx` when running one-off executables — `pnpx` is pnpm's own long-standing `dlx` alias (not new to v11; only the even-shorter `pn`/`pnx` aliases were added in v11).

## Dependency Management

This repo uses **pnpm catalogs** for shared dependency versions. The catalog is defined in `pnpm-workspace.yaml`.

**When adding or updating a dependency that is already in the catalog**, use `"catalog:"` as the version in `package.json` — never hardcode the version string.

**When adding a new dependency that is used in 2 or more packages**, add it to the catalog in `pnpm-workspace.yaml` first, then reference it as `"catalog:"` in each `package.json`.

**To upgrade a cataloged dependency**, update the version in `pnpm-workspace.yaml` and run `pnpm install`. Do not update individual `package.json` files.

Current catalog entries: `wrangler`, `typescript`, `hono`, `zod`, `vitest`, `lodash-es`, `@types/lodash-es`, `@cloudflare/workers-types`, `@types/node`.

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

## Updating Package Dependencies

When asked to update all dependencies, follow this workflow:

**1. Scan for outdated packages:**

```sh
pnpm outdated -r
```

This lists every outdated dependency across all workspace packages, grouped by package. Review the full output before making any changes.

**2. Classify each outdated dependency into one of these categories:**

| Category                | Where to update                                | How                                                                          |
| ----------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| **Cataloged**           | `pnpm-workspace.yaml` only                     | Bump the version in `catalog:`. Never touch individual `package.json` files. |
| **Has its own codemod** | N/A — run the codemod                          | e.g. `pnpx @turbo/codemod@latest update` for Turbo.                          |
| **Non-cataloged**       | The specific `package.json`(s) that declare it | Edit version strings directly.                                               |

**3. Review changelogs for non-patch bumps.** Patch-only bumps don't need changelog review — just update them. For minor and major version jumps:

- **Resolve the GitHub repo** for each package: `npm view <pkg> repository.url`
- **For major bumps** — fetch release notes and flag breaking changes to the user before proceeding:
  ```sh
  gh api repos/{owner}/{repo}/releases --jq '.[] | select(.tag_name == "vX.Y.Z") | .body'
  ```
  Tag formats vary by repo (`v1.2.3`, `@scope/pkg@1.2.3`, `release-YYYY-MM-DD-HHMM`). Check a few recent tags first if the format is unclear: `gh api repos/{owner}/{repo}/releases --jq '.[0:5] | .[] | .tag_name'`
- **For minor bumps** — construct a GitHub compare URL for quick review: `https://github.com/{owner}/{repo}/compare/vCurrent...vLatest`
- **Summarize notable changes** (new features, deprecations, breaking changes) in the final update summary.

**4. Check for codemods before bumping.** These packages have dedicated update tools — always use them instead of manual version edits:

- **Turbo**: `pnpx @turbo/codemod@latest update` — interactive, must be run by the user

If a package's changelog or docs mention a codemod for the version jump, use it. **Codemods are interactive** — prompt the user to run them in their terminal before proceeding with the remaining updates. Wait for confirmation before continuing.

**5. Update in dependency order:**

1. **Catalog entries** — bump versions in `pnpm-workspace.yaml`
2. **Shared packages** (`packages/*`) — non-cataloged deps
3. **Services** (`apps/service-*`) — non-cataloged deps
4. **Apps** (`apps/gw2w2w`) — non-cataloged deps
5. **Root** (`package.json`) — non-cataloged dev deps

**6. Run `pnpm install`** to resolve and lock all updated versions.

```sh
pnpm install
```

**7. Verify nothing is still outdated:**

```sh
pnpm outdated -r
```

If packages remain outdated, investigate — the semver range may need a bump (e.g. `^4.x` → `^5.x` for a major).

**8. Run `pnpm audit` and fix any vulnerabilities:**

- If a transitive dependency has a known vulnerability with a patched version, add a pnpm override in `pnpm-workspace.yaml` to force the patched version. Include the GHSA ID(s) in a comment.
- Run `pnpm install` after adding overrides, then re-run `pnpm audit` to confirm a clean result.

**9. Run `pnpm format && pnpm ci:all`** — the full verification pipeline. Fix any errors before finishing.

**10. Review existing overrides in `pnpm-workspace.yaml`:**

- For each override, check whether the root dependency has been updated to a version that no longer pulls in the vulnerable transitive. Run `pnpm why <pkg>` to check the resolved version.
- Remove overrides that are no longer needed (the direct dependency now resolves to a safe version on its own).
- Run `pnpm install` and `pnpm audit` after removing stale overrides to confirm they're truly unnecessary.

**11. Present a summary** listing what was updated, grouped by category (catalog, codemod, direct). Include before → after versions and any overrides added or removed.

### Important rules

- **Never edit `package.json` version strings for cataloged dependencies.** They use `"catalog:"` — the real version lives in `pnpm-workspace.yaml`.
- **Keep the catalog list in AGENTS.md current.** If you add or remove a catalog entry, update the "Current catalog entries" list in the Dependency Management section.
- **Major version bumps require caution.** If `pnpm outdated` shows a major version jump, check the changelog for breaking changes before updating. Flag any breaking changes to the user.
- **Don't update `pnpm` itself via this workflow.** The `packageManager` field in root `package.json` pins the exact pnpm version and should be updated deliberately via `corepack use pnpm@latest`.
- **Overrides are temporary.** Every override should include a GHSA comment explaining why it exists. Remove overrides as soon as the parent dependency ships a fix.

## Post-Change Verification

**After making any code changes, run the single verification script:**

```sh
pnpm format && pnpm ci:all
```

This formats all files, then runs all CI checks in order: format (verify) → lint (type-aware) → type-check → boundary-check → test → audit. Fix any errors before finishing. Individual commands are also available as `ci:format`, `ci:lint`, `ci:types`, `ci:boundaries`, and `ci:test`. Individual commands are documented below for reference.

**For agents/CLI use, `pnpm ci:all:quiet` (and `pnpm ci:all:quiet-force`, the cache-bypassing equivalent of `ci:all:force`) run the identical pipeline but pass `--output-logs=errors-only` to the turbo-driven steps (`ci:lint`, `ci:types`, `ci:test`).** Passing packages are collapsed to the task-graph summary line instead of full streamed output; any failing package still prints its full log automatically. `ci:format`, `ci:boundaries`, and `ci:audit` are already terse and unaffected by the flag. Prefer the quiet variant when you don't need to eyeball passing output, to keep verification runs out of the context window.

**A task is not complete until `pnpm ci:all` (or `ci:all:quiet`) reports a full clear signal.** Don't stop at "I ran it and saw some warnings" or "the failures are pre-existing" without re-confirming — re-run after every fix until every stage passes (or the only failure is a known, separately-tracked issue like a dependency audit advisory that the user has explicitly told you to ignore). Partial verification is not verification.

**`pnpm ci:all` doesn't cover every script.** Dev-utility scripts like `ts:clean` aren't wired into the CI pipeline. When you rename, remove, or re-alias a shared tool/binary, grep the affected `package.json`'s full `scripts` block for every reference to the old invocation, not just the ones `ci:all` exercises, and verify each one still resolves correctly.

## Addressing PR Review Comments

When asked to address PR review comments, follow this workflow:

**1. Retrieve review threads via the GitHub CLI (GraphQL):**

```sh
gh api graphql -f query='
  { repository(owner:"OWNER", name:"REPO") {
    pullRequest(number:PULL_NUMBER) {
      reviewThreads(first:100) { nodes {
        isResolved, isOutdated,
        comments(first:5) { nodes { path, body, author { login } } }
      }}
    }
  }}'
```

This returns `isResolved` and `isOutdated` per thread — data the REST comments endpoint does not expose.

**2. Skip resolved threads.** Filter to `isResolved == false` before doing any analysis. Resolved threads have already been addressed. Only process unresolved threads.

**3. Deduplicate before acting.** Automated reviewers often flag the same root issue across multiple files. Group related unresolved comments and address them as a single fix rather than applying changes file-by-file.

**4. Check the current file state.** Comments reference the diff at review time. `isOutdated == true` means the diff has moved. Always `read_file` before assuming an unresolved comment still applies.

**5. Triage each unresolved comment into one of three categories:**

- **Already fixed** — the issue was addressed in a prior commit. No action needed.
- **Will fix** — the comment is valid and actionable. Apply the change.
- **Pushback** — the suggestion is incorrect, conflicts with project conventions, or would introduce unnecessary code. Explain why.

**6. Validate suggestions against the actual codebase before applying:**

- Check whether types, lint rules, or runtime behavior support the suggestion.
- If lint flags a suggested change as unnecessary (e.g. `@typescript-eslint/no-unnecessary-condition`), the lint rule wins — the suggestion is wrong.
- Do not add dead code (unreachable guards, redundant null checks) just because a reviewer asked for it.

**7. Fix in dependency order.** Fix shared/upstream code first (e.g., API layer, types), then callers. This avoids intermediate states that break type-checking.

**8. Distinguish automated vs human reviewers.** Copilot review comments are heuristic-based and frequently wrong about type-level guarantees. Human reviewer comments deserve more weight and benefit of the doubt.

**9. Run `pnpm format && pnpm ci:all` after all changes.** Lint and type-check failures reveal when a suggestion conflicts with the actual type system.

**10. Present a summary** of what was fixed, what was left as-is, and why.

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
| `packages/oxlint-config`     | Shared Oxlint config presets                                                                                                     |
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

## GW2 API Endpoints Used

- `GET /v2/emblem/backgrounds?ids=all` — [docs](https://wiki.guildwars2.com/wiki/API:2/emblem/backgrounds)
- `GET /v2/emblem/foregrounds?ids=all` — [docs](https://wiki.guildwars2.com/wiki/API:2/emblem/foregrounds)
- `GET /v2/colors?ids=all` — [docs](https://wiki.guildwars2.com/wiki/API:2/colors)
- `GET /v2/guild/search?name=<name>` — [docs](https://wiki.guildwars2.com/wiki/API:2/guild/search)
- `GET /v2/guild/<id>` — [docs](https://wiki.guildwars2.com/wiki/API:2/guild/:id)
- `GET /v2/wvw/matches` / `?ids=all` / `?world=<id>` — [docs](https://wiki.guildwars2.com/wiki/API:2/wvw/matches)
- `GET /v2/wvw/matches/overview?ids=all` — lightweight: worlds + schedule only
- `GET /v2/wvw/matches/stats?ids=all` — kills/deaths per team per map
- `GET /v2/wvw/objectives?ids=all` — [docs](https://wiki.guildwars2.com/wiki/API:2/wvw/objectives)
- `GET /v2/worlds?ids=all` — [docs](https://wiki.guildwars2.com/wiki/API:2/worlds)

General API reference: https://wiki.guildwars2.com/wiki/API:Main

## Local API Reference Docs

`apps/service-api/ref/api.guildwars2/` contains local documentation and live-sampled responses:

- **`API.md`** — schema reference for all endpoints consumed by this project, with TypeScript type definitions, parameter tables, and known bugs
- **`samples/`** — real API responses captured from the live GW2 API (sampled 2026-04-11):
  - `wvw-matches-root.json` — root `/v2/wvw/matches` (array of active match IDs)
  - `wvw-matches-all-single.json` — single full match object (trimmed; full response is ~47 KB per match)
  - `wvw-matches-overview-all.json` — all 9 active matches from `/v2/wvw/matches/overview?ids=all`
  - `wvw-matches-stats-all.json` — all 9 active matches from `/v2/wvw/matches/stats?ids=all`

## D1 Database (`service-api`)

The `wvw-events` D1 database is used exclusively by `apps/service-api`. Schema and query access are managed by **Drizzle ORM**.

### Schema files

- **`apps/service-api/src/db/schema.ts`** — Drizzle table definitions (`matchState`, `events`). This is the source of truth for the D1 schema.
- **`apps/service-api/src/db/index.ts`** — `getDb(d1)` factory; call this at the top of any route handler that needs D1.
- **`apps/service-api/migrations/`** — raw SQL migration files applied via `wrangler d1 migrations apply`. These are NOT generated by Drizzle — they are hand-written and applied manually.

### Critical rule: keep schema.ts in sync with migrations

**Whenever you add or modify a D1 migration file, you must also update `src/db/schema.ts` to match.** The two are not automatically linked — Drizzle reads the schema file, not the migration history.

If a migration adds a column, adds a table, renames something, or changes a constraint, the corresponding Drizzle table definition must be updated in the same change. Failing to do so will cause TypeScript type errors or silent runtime mismatches between the generated SQL and the actual D1 schema.

> Note: `drizzle-kit` is **not** used in this project — we do not generate migrations from the schema or push schema changes via Drizzle. All schema changes go through hand-written `.sql` files in `migrations/` applied with `wrangler d1 migrations apply`.
