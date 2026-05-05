# Documentation Structure Improvements

Add per-app/package documentation to the monorepo. Each doc must be verified against actual source code before committing.

## Rules

- Every claim must be verified against the actual source code — no hypothetical examples
- No deployment information (deployment is automatic on merge to main)
- Only reference config that is actually enabled (e.g., placement hints are commented out in service-api)
- Use code snippets copied from real files, not rewritten from memory
- Each AGENTS.md should contain only rules specific to that app — don't repeat root AGENTS.md content

---

## Housekeeping

- [x] Rename root `AGENT.md` → `AGENTS.md` for consistency with VS Code auto-discovery
- [x] Update `.github/copilot-instructions.md` to reference `AGENTS.md`

---

## Current State

| File                                 | Status    | Notes                                        |
| ------------------------------------ | --------- | -------------------------------------------- |
| `README.md` (root)                   | ✅ Done   | Comprehensive overview, links to sub-READMEs |
| `AGENTS.md` (root)                   | ✅ Done   | Project context, workflows, conventions      |
| `apps/gw2w2w/README.md`              | ✅ Done   | Features, architecture, bindings, tech stack |
| `apps/service-api/README.md`         | ✅ Done   | Endpoints, caching, DO, D1, bindings         |
| `apps/service-emblem/README.md`      | ✅ Done   | Endpoints, rendering pipeline, caching       |
| `packages/emblem-renderer/README.md` | ✅ Done   | Exports, compositing pipeline, testing       |
| `packages/utils/README.md`           | ✅ Done   | Exports table with all functions             |
| `packages/eslint-config/README.md`   | ✅ Exists | Basic description present                    |
| `apps/gw2w2w/AGENTS.md`              | ✅ Done   | OpenNext, route/UI separation, WASM, SSE     |
| `apps/service-api/AGENTS.md`         | ✅ Done   | Routes, OpenAPI, DO patterns, caching        |
| `apps/service-emblem/AGENTS.md`      | ✅ Done   | WASM, rendering order, R2, service binding   |
| `packages/emblem-renderer/AGENTS.md` | ✅ Done   | Platform independence, compositing rules     |

---

## Plan

### Phase 1: Auto-generated API docs (`service-api`)

Add OpenAPI spec generation to `service-api` using [`hono-openapi`](https://github.com/rhinobase/hono-openapi) + [`@scalar/hono-api-reference`](https://github.com/scalar/scalar) for a browsable UI.

**Why `hono-openapi`:** Keeps the standard `Hono` class (no swap to `OpenAPIHono`). Existing Zod schemas auto-populate request params in the spec via its `validator()` replacement. Routes stay `.get()/.post()` — just add `describeRoute()` middleware wrappers.

**Steps:**

- [x] Install `hono-openapi`, `@hono/standard-validator`, `@scalar/hono-api-reference`
- [x] Replace `zValidator(...)` → `validator(...)` from `hono-openapi` in route files
- [x] Add `describeRoute({...})` middleware to each route with summary, description, response schemas
- [x] Mount `/doc` endpoint with `openAPIRouteHandler(app, {...})`
- [x] Mount `/scalar` endpoint with `Scalar({ url: '/doc' })`
- [x] Verify all routes appear in generated spec
- [ ] Optionally add `/llms.txt` endpoint via `@scalar/openapi-to-markdown`

### Phase 2: READMEs + AGENTS.md (per app)

For each app, create a README and AGENTS.md based on reading the actual source.

**READMEs** — purpose, local dev command, key files, features/endpoints:

- [x] `apps/gw2w2w/README.md` — Replace Next.js template. Cover features (emblem designer, WvW tracker), React Compiler, OpenNext
- [x] `apps/service-api/README.md` — Hono Worker, API endpoints (verify route files), MatchupPoller DO, caching strategy
- [x] `apps/service-emblem/README.md` — Hono Worker, emblem rendering pipeline, R2 caching, Service Binding to service-api

**AGENTS.md** — app-specific rules for AI agents working in that directory:

- [x] `apps/gw2w2w/AGENTS.md` — React Compiler (no useMemo/useCallback), Photon WASM lazy-loading, texture download gate, OpenNext constraints
- [x] `apps/service-api/AGENTS.md` — DO alarm-first pattern, SSE writer lifecycle, Hono RPC for Service Bindings
- [x] `apps/service-emblem/AGENTS.md` — Flip before composite, single-pass pixel loop, R2 cache with jitter, resize after composite
- [x] `packages/emblem-renderer/AGENTS.md` — Platform independence (zero deps in pixels.ts), bg uses red channel mask, fg uses alpha channel, `renderEmblemPixels` API

### Phase 3: Package READMEs

- [x] `packages/emblem-renderer/README.md` — Compositing engine overview, files, platform independence
- [x] `packages/utils/README.md` — List actual exports: `withJitter`, `allowedCsrf`, `allowedOrigin`, `normalizeGuildName`, `validateArenaNetUuid`

### Cross-references

After all files exist:

- [x] Update root `README.md` — Add links from app/package tables to their READMEs

---

## Success Criteria

- New contributors can understand an app's purpose in < 5 minutes
- Every claim in the docs is verifiable in the source code
- The root README stays comprehensive without duplicating sub-docs
