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

- [ ] Rename root `AGENT.md` → `AGENTS.md` for consistency with VS Code auto-discovery
- [ ] Update `.github/copilot-instructions.md` to reference `AGENTS.md`

---

## Current State

| File                                   | Status      | Notes                                        |
| -------------------------------------- | ----------- | -------------------------------------------- |
| `README.md` (root)                     | ✅ Good     | Comprehensive overview, architecture diagram |
| `AGENTS.md` (root, currently AGENT.md) | ✅ Good     | Project context, workflows, conventions      |
| `apps/gw2w2w/README.md`                | ❌ Missing  | Has default Next.js template content         |
| `apps/service-api/README.md`           | ❌ Missing  | No documentation                             |
| `apps/service-emblem/README.md`        | ❌ Missing  | No documentation                             |
| `packages/emblem-renderer/README.md`   | ❌ Missing  | No documentation                             |
| `packages/utils/README.md`             | ❌ Optional | Brief overview of exports                    |
| `packages/eslint-config/README.md`     | ✅ Exists   | Basic description present                    |
| `apps/gw2w2w/AGENTS.md`                | ❌ Create   | React Compiler + OpenNext rules              |
| `apps/service-api/AGENTS.md`           | ❌ Create   | DO alarm patterns, SSE, Service Bindings     |
| `apps/service-emblem/AGENTS.md`        | ❌ Create   | WASM compositing, R2 caching                 |
| `packages/emblem-renderer/AGENTS.md`   | ❌ Create   | Platform-independent rendering rules         |

---

## Plan

### Phase 1: Auto-generated API docs (`service-api`)

Add OpenAPI spec generation to `service-api` using [`hono-openapi`](https://github.com/rhinobase/hono-openapi) + [`@scalar/hono-api-reference`](https://github.com/scalar/scalar) for a browsable UI.

**Why `hono-openapi`:** Keeps the standard `Hono` class (no swap to `OpenAPIHono`). Existing Zod schemas auto-populate request params in the spec via its `validator()` replacement. Routes stay `.get()/.post()` — just add `describeRoute()` middleware wrappers.

**Steps:**

- [ ] Install `hono-openapi`, `@hono/standard-validator`, `@scalar/hono-api-reference`
- [ ] Replace `zValidator(...)` → `validator(...)` from `hono-openapi` in route files
- [ ] Add `describeRoute({...})` middleware to each route with summary, description, response schemas
- [ ] Mount `/doc` endpoint with `openAPIRouteHandler(app, {...})`
- [ ] Mount `/scalar` endpoint with `Scalar({ url: '/doc' })`
- [ ] Verify all routes appear in generated spec
- [ ] Optionally add `/llms.txt` endpoint via `@scalar/openapi-to-markdown`

### Phase 2: READMEs + AGENTS.md (per app)

For each app, create a README and AGENTS.md based on reading the actual source.

**READMEs** — purpose, local dev command, key files, features/endpoints:

- [ ] `apps/gw2w2w/README.md` — Replace Next.js template. Cover features (emblem designer, WvW tracker), React Compiler, OpenNext
- [ ] `apps/service-api/README.md` — Hono Worker, API endpoints (verify route files), MatchupPoller DO, caching strategy
- [ ] `apps/service-emblem/README.md` — Hono Worker, emblem rendering pipeline, R2 caching, Service Binding to service-api

**AGENTS.md** — app-specific rules for AI agents working in that directory:

- [ ] `apps/gw2w2w/AGENTS.md` — React Compiler (no useMemo/useCallback), Photon WASM lazy-loading, texture download gate, OpenNext constraints
- [ ] `apps/service-api/AGENTS.md` — DO alarm-first pattern, SSE writer lifecycle, Hono RPC for Service Bindings, 50ms CPU budget
- [ ] `apps/service-emblem/AGENTS.md` — Flip before composite, single-pass pixel loop, R2 cache with jitter, resize after composite
- [ ] `packages/emblem-renderer/AGENTS.md` — Platform independence (zero deps in pixels.ts), bg uses red channel mask, fg uses alpha channel, `renderEmblemPixels` API

### Phase 3: Package READMEs

- [ ] `packages/emblem-renderer/README.md` — Compositing engine overview, files, platform independence
- [ ] `packages/utils/README.md` — List actual exports: `withJitter`, `allowedCsrf`, `allowedOrigin`, `normalizeGuildName`, `validateArenaNetUuid`

### Cross-references

After all files exist:

- [ ] Update root `README.md` — Add links from app/package tables to their READMEs

---

## Success Criteria

- New contributors can understand an app's purpose in < 5 minutes
- Every claim in the docs is verifiable in the source code
- The root README stays comprehensive without duplicating sub-docs
