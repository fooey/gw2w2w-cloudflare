# Documentation Structure Improvements

This document tracks all documentation improvements for the gw2w2w-cloudflare monorepo.

## Goals

- Make it easy for new contributors to understand each app/package's purpose
- Document complex architectural decisions without overwhelming the main README
- Keep high-level docs (root README, AGENT.md) comprehensive but not fragmented
- Follow existing patterns from `.agents/skills/` folder

---

## Current State

| File                                         | Status         | Notes                                                      |
| -------------------------------------------- | -------------- | ---------------------------------------------------------- |
| `README.md` (root)                           | ✅ Excellent   | Comprehensive, well-maintained per AGENT.md instructions   |
| `AGENT.md` (root)                            | ✅ Excellent   | Project context, architecture diagrams, detailed workflows |
| `apps/gw2w2w/README.md`                      | ❌ Missing     | Has default Next.js template content                       |
| `apps/service-api/README.md`                 | ❌ Missing     | No documentation exists                                    |
| `apps/service-emblem/README.md`              | ❌ Missing     | No documentation exists                                    |
| `packages/emblem-renderer/README.md`         | ❌ Missing     | No documentation exists                                    |
| `packages/utils/README.md`                   | ❌ Optional    | Could have 2-3 lines of overview                           |
| `packages/eslint-config/README.md`           | ✅ Exists      | Basic description already present                          |
| `packages/typescript-config/README.md`       | ❌ Missing     | Not needed (simple utility)                                |
| `packages/vitest-config/README.md`           | ❌ Missing     | Not needed (internal tooling)                              |
| `apps/service-api/ARCHITECTURE.md`           | ❌ Recommended | Durable Object design is complex                           |
| `apps/service-emblem/ARCHITECTURE.md`        | ❌ Optional    | Rendering pipeline could use deep dive                     |
| `packages/emblem-renderer/ARCHITECTURE.md`   | ❌ Recommended | Platform-independent compositing logic                     |
| `apps/gw2w2w/.agents/AGENTS.md`              | ❌ Recommended | React Compiler + OpenNext rules                            |
| `apps/service-api/.agents/AGENTS.md`         | ❌ Recommended | Workers best practices                                     |
| `apps/service-emblem/.agents/AGENTS.md`      | ❌ Recommended | Photon + compositing patterns                              |
| `packages/emblem-renderer/.agents/AGENTS.md` | ❌ Recommended | Rendering engine specialist                                |

---

## Verification & Analysis Protocol

**Before writing any documentation, we must verify:**

1. **Code matches documented patterns** — Does the implementation actually follow what's in AGENT.md or the root README?
2. **Approaches are still optimal** — Are we using the latest best practices (e.g., React Compiler rules, Photon WASM integration)?
3. **Consistency across codebase** — Do all apps use the same patterns for similar tasks (e.g., error handling, caching)?
4. **Documentation gaps** — What's missing from the docs that the code already does?

This ensures we're not just documenting what exists, but also improving it.

---

## Priority Matrix

### 🔴 High Priority (Do First)

These provide the most immediate value to new contributors:

- [ ] **Create README.md for each app** (`apps/gw2w2w`, `service-api`, `service-emblem`)
  - One-sentence purpose
  - Local dev commands (no deployment info)
  - Key files overview
  - API endpoints or main features

  **Note:** For `service-api`, also create dedicated API docs in `/docs/api.md` with full endpoint list, request/response schemas, and caching strategies.

  **Verification & Best Practice Checklist:**
  - [ ] Does the app actually follow React Compiler rules (no useMemo/useCallback)?
  - [ ] Are Service Bindings used correctly for Worker-to-Worker calls?
  - [ ] Is Photon WASM integrated consistently across server and browser paths?
  - [ ] **Best Practice Analysis:** What patterns should we adopt? (e.g., consistent error handling, logging strategy)
  - [ ] **Gap Identification:** Are there undocumented conventions that need formalizing?
  - One-sentence purpose
  - Local dev commands
  - Key files overview
  - API endpoints or main features

- [ ] **Create AGENTS.md for each app** (`.agents/AGENTS.md` in all apps)
  - Follow existing `.agents/skills/` patterns
  - App-specific best practices and gotchas
  - React Compiler rules (for frontend)
  - Workers runtime quirks (no deployment info)

  **Verification & Best Practice Checklist:**
  - [ ] Does the app actually follow React Compiler rules in practice?
  - [ ] Are there any `useMemo`/`useCallback` that should be removed?
  - [ ] Is Photon WASM lazy-loaded correctly on first use?
  - [ ] Are flip transforms applied before compositing (not after)?
  - [ ] Does the app handle CPU budget limits (<50ms) consistently?
  - [ ] **Best Practice Analysis:** What patterns should we adopt? (e.g., consistent error handling, logging strategy)
  - [ ] **Gap Identification:** Are there undocumented conventions that need formalizing?

### 🟡 Medium Priority (Do Next)

These document complex architectural decisions:

- [ ] **Create ARCHITECTURE.md for service-api**
  - Durable Object alarm loop pattern
  - SSE fanout implementation details
  - Objective diffing algorithm
  - Event replay from D1 on reconnect

  **Verification & Best Practice Checklist:**
  - [ ] Does the DO actually set alarms at the START of each handler (before I/O)?
  - [ ] Are objective snapshots kept in memory and compared correctly?
  - [ ] Is event replay capped at 500 rows as documented?
  - [ ] Do all SSE writers handle disconnect/reconnect gracefully?
  - [ ] **Best Practice Analysis:** What patterns should we adopt? (e.g., consistent error handling, logging strategy)
  - [ ] **Gap Identification:** Are there undocumented conventions that need formalizing?

- [ ] **Create ARCHITECTURE.md for emblem-renderer**
  - Platform-independent `pixels.ts` design
  - Photon WASM integration points
  - Color blending math (red channel as opacity mask)
  - Cache invalidation strategy per layer type

  **Verification Checklist:**
  - [ ] Does `pixels.ts` use a single-pass loop with no intermediate allocations?
  - [ ] Are flip transforms applied via Photon before compositing (not after)?
  - [ ] Is the red channel used as an opacity mask for flat colors (not multiply blend)?
  - [ ] Do server and browser paths both call `pixels.ts` identically?

### 🟢 Low Priority (Optional / As Needed)

These are nice-to-haves or only needed if complexity warrants:

- [ ] **Create README.md for packages** (`utils`, `eslint-config` already has basic content)
  - Keep minimal: 2-3 lines of what's inside
- [ ] **Add DESIGN_DECISIONS.md where appropriate**
  - Only if an app has complex trade-offs worth documenting separately
  - Likely unnecessary (root README already covers this well)

- [ ] **Create additional docs in `/docs/` folder**
  - `todo/v2-realtime-wvw.md` — Already exists ✅
  - Future: roadmap, feature proposals, technical debt tracking

---

## Implementation Plan

### Phase 1: App READMEs + AGENTS (Week 1)

**Goal:** New contributors can immediately understand what each app does and how to work with it.

| Task        | Files to Create                                                                        | Estimated Time |
| ----------- | -------------------------------------------------------------------------------------- | -------------- |
| App READMEs | `apps/gw2w2w/README.md`, `apps/service-api/README.md`, `apps/service-emblem/README.md` | 30 min         |
| App AGENTS  | `.agents/AGENTS.md` in each app (3 files)                                              | 45 min         |

**Total:** ~1.5 hours of focused work

### Phase 2: Architecture Deep Dives (Week 2)

**Goal:** Document complex systems without overwhelming the main README.

| Task                         | Files to Create                            | Estimated Time |
| ---------------------------- | ------------------------------------------ | -------------- |
| service-api ARCHITECTURE     | `apps/service-api/ARCHITECTURE.md`         | 1 hour         |
| emblem-renderer ARCHITECTURE | `packages/emblem-renderer/ARCHITECTURE.md` | 45 min         |

**Total:** ~2 hours of focused work

### Phase 3: Package READMEs (Week 3 - Optional)

**Goal:** Complete the documentation coverage for all packages.

| Task                   | Files to Create                                                         | Estimated Time |
| ---------------------- | ----------------------------------------------------------------------- | -------------- |
| Simple package READMEs | `packages/utils/README.md`, `packages/eslint-config/README.md` (update) | 15 min         |

**Total:** ~15 minutes

---

## Content Templates

### App README Template

````markdown
# <app-name> — <one-sentence purpose>

<Short description, e.g., "Renders guild emblems as WebP images by name or ID.">

## Local Development

```bash
pnpm dev          # Start on port XXXX
```
````

> **Note:** Deployment is handled automatically when code is merged to the main branch. No manual deployment steps are required.

## Key Files

- `src/index.ts` — <brief description>
- `wrangler.toml` — KV/R2 bindings, runtime configuration (no deployment info)
- `.dev.vars` — Environment variables (local only)

## API / Features

<If applicable: list main endpoints or features>

## Dependencies Specific to This App

<Only if different from root package.json>
```

### AGENTS.md Template

```markdown
# <app-name> Agent Guidelines

This file contains best practices, gotchas, and architectural patterns specific to this app.

## React Compiler Rules (if frontend)

- Never use `useMemo`, `useCallback`, or `React.memo()` — the compiler handles it
- Keep render functions pure — no side effects in JSX
- Write standard, readable JavaScript — don't optimize prematurely

## Workers Runtime Gotchas

- CPU budget is 50ms — keep WASM compositing loops single-pass
- Use Service Bindings for Worker-to-Worker calls (zero latency)
- Place Workers near upstream APIs: `placement.hostname = "api.guildwars2.com"`

## Photon WASM Integration

- Server: use `@cf-wasm/photon` for PNG decode, flip transforms, WebP encode
- Browser: use `@silvia-odwyer/photon` via dynamic import (lazy-load once)
- Always apply flip flags before compositing

## Common Pitfalls

<Add specific issues you've encountered>
```

### ARCHITECTURE.md Template

````markdown
# <component-name> Architecture

This document provides a deep dive into the architecture of <component>, focusing on design decisions and implementation details.

## Overview

<High-level description of what this component does>

## Core Design Decisions

### Why we chose X over Y

<Explain trade-offs, e.g., "Durable Object vs cron job for polling">

### How the alarm loop works

<Step-by-step explanation with code snippets if helpful>

## Data Flow

```mermaid
<diagram>
```
````

## Key Algorithms

### Objective diffing

<Explain how changes are detected and emitted as events>

### Cache invalidation strategy

<TTL calculations, jitter implementation, thundering herd prevention>

## Testing Strategy

<How to test this component locally, what Vitest files exist>

````

---

## Success Criteria

A documentation improvement is successful when:

- ✅ New contributors can understand an app's purpose in < 5 minutes
- ✅ Complex architectural decisions are explained without reading the entire codebase
- ✅ The main README remains comprehensive but not fragmented
- ✅ Documentation stays up-to-date with code changes (easy to maintain)

---

## Best Practice Analysis Framework

**When analyzing code during documentation tasks, look for these patterns:**

### ✅ Patterns We Should Adopt
- **Consistent error handling** — All apps use the same try/catch/logging approach?
- **Logging strategy** — Are we using `console.info`, `console.warn`, `console.error` consistently?
- **Resource cleanup** — Are streams, timers, and WASM modules properly closed on errors?
- **Type safety** — Are all API responses typed correctly (no `any` or loose typing)?
- **Testing coverage** — Do we have Vitest tests for critical paths? What's missing?

### ❌ Patterns We Should Avoid
- **Direct state mutation** — Never mutate props/state directly (use setters)
- **Blocking operations in render** — No async/await or I/O in JSX
- **Hardcoded strings** — Use constants for API endpoints, error messages
- **Duplicate logic** — Extract shared functions to packages/

### 🤔 Patterns We Should Investigate
- **Why did we choose X over Y?** — Document trade-offs (e.g., Durable Object vs cron job)
- **Are there undocumented workarounds?** — Find and formalize them
- **Is this the latest best practice?** — Check Cloudflare docs, React team blog

---

## Verification Workflow

**For every documentation task, follow this sequence:**

### Step 1: Code Analysis (Before Writing Docs)

```bash
# For each app/package:
grep -r "useMemo\|useCallback" src/          # Check React Compiler compliance
grep -r "placement\.hostname" wrangler.toml   # Verify placement hints
cat src/index.ts | grep -A5 "ctx.storage.setAlarm"  # DO alarm loop pattern
````

**What to look for:**

- ❌ `useMemo`/`useCallback` — should be removed (compiler handles it)
- ✅ Service Binding calls use Hono RPC (no HTTP fetches)
- ✅ Photon WASM loaded via dynamic import in browser code
- ✅ Flip transforms applied before compositing

### Step 2: Pattern Consistency Check

Compare across apps:

- **Error handling** — Do all apps use the same try/catch patterns?
- **Caching** — Are TTLs consistent (e.g., colors = 1 year, emblems = 24h)?
- **WASM integration** — Server uses `@cf-wasm/photon`, browser uses `@silvia-odwyer/photon`

### Step 3: Documentation Gap Analysis

Ask:

- What does the code do that's NOT documented?
- Are there undocumented workarounds or hacks?
- Is there a pattern we should document but haven't yet?

### Step 4: Write & Verify

When writing docs, include:

- ✅ Code snippets from actual implementation (not hypothetical)
- ✅ Mermaid diagrams that match the real data flow
- ✅ "Gotchas" section with real issues encountered
- ✅ Links to relevant AGENT.md or root README sections

### Step 5: Post-Writing Review

After creating a doc:

1. Read it aloud — does it make sense without prior knowledge?
2. Compare against the code — can you find every claim in the implementation?
3. Check for outdated info (e.g., old Photon package names)
4. Ensure no sensitive data (API keys, secrets) is exposed

---

## Success Criteria

A documentation improvement is successful when:

- ✅ New contributors can understand an app's purpose in < 5 minutes
- ✅ Complex architectural decisions are explained without reading the entire codebase
- ✅ The main README remains comprehensive but not fragmented
- ✅ Documentation stays up-to-date with code changes (easy to maintain)
- ✅ **Every claim in the docs is verifiable in the code**
- ✅ **No undocumented patterns exist that contradict the docs**
