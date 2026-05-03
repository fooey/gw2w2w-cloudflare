# Documentation Verification Checklist

Use this checklist when creating or updating any documentation for gw2w2w-cloudflare.

## Before Writing Docs

### 1. Code Analysis
- [ ] **React Compiler compliance** — Search for `useMemo`, `useCallback`, `React.memo()`
  - Expected: None (compiler handles all memoization)
  - If found: Document as a gotcha or remove the pattern

- [ ] **Service Binding usage** — Check that Worker-to-Worker calls use Hono RPC, not HTTP fetches
  - Look for `ctx.service` bindings in route handlers
  - Verify no `fetch()` calls to same-host endpoints

- [ ] **Photon WASM integration**
  - Server: `@cf-wasm/photon` (PNG decode, flip transforms, WebP encode)
  - Browser: `@silvia-odwyer/photon` via dynamic import
  - Verify flip flags applied BEFORE compositing

- [ ] **Placement hints** — Check `wrangler.toml` for `placement.hostname = "api.guildwars2.com"`
  - Only in `service-api`, not other apps

### 2. Pattern Consistency & Best Practices
Compare with other apps:

| Pattern | Expected Implementation | Best Practice Status |
|---------|------------------------|---------------------|
| Error handling | Try/catch at route level, log to Cloudflare Logs | ✅ Adopt if consistent |
| Caching TTLs | Colors: 1 year, Emblems: 24h, Guild JSON: 24h, Static data: 30 days | ✅ Adopt if consistent |
| WASM loading | Dynamic import with cache busting on build ID change | ✅ Adopt if consistent |
| CPU budget | Single-pass loops, no per-pixel branching | ✅ Adopt if consistent |
| Logging levels | Use `console.info`, `console.warn`, `console.error` only | ✅ Adopt if consistent |
| Resource cleanup | Close streams, timers, WASM modules on errors | ⚠️ Investigate if inconsistent |
| Type safety | No `any` or loose typing in API responses | ✅ Adopt if consistent |

### 3. Documentation Gaps & Best Practice Analysis
Ask these questions:
- [ ] What does the code do that's NOT documented in root README or AGENT.md?
- [ ] Are there undocumented workarounds (e.g., "we use X because Y is broken")?
- [ ] Is there a pattern we should document but haven't yet?
- [ ] **Best Practice Analysis:** What patterns should we adopt across the codebase? (error handling, logging, resource cleanup)
- [ ] Are there inconsistencies that need standardizing?

## While Writing Docs

### Content Requirements
- ✅ **Code snippets** — Use real code from the implementation, not hypothetical examples
- ✅ **Mermaid diagrams** — Must match actual data flow (verify against code)
- ✅ **Gotchas section** — Include real issues encountered in production/local dev
- ✅ **Links to existing docs** — Reference AGENT.md or root README sections where relevant

### Style Guidelines
- [ ] Use imperative mood: "Do X" not "X should be done"
- [ ] Avoid jargon without explanation (e.g., explain "Service Binding" on first use)
- [ ] Include file paths for every code snippet mentioned
- [ ] Keep sections under 300 words each (break up long docs)

### Accuracy Checks
After writing a section:
1. **Read aloud** — Does it make sense without prior knowledge?
2. **Code verification** — Can you find every claim in the implementation?
3. **Outdated info** — Check for old package names, deprecated APIs, stale URLs
4. **Sensitive data** — No API keys, secrets, or internal infrastructure details

## After Writing Docs

### Review Checklist
- [ ] **Cross-reference** — Do all links work? Are file paths correct?
- [ ] **Consistency** — Does this match other app docs (if applicable)?
- [ ] **Completeness** — Have I covered the main use cases and edge cases?
- [ ] **Clarity** — Would a new contributor understand this in < 5 minutes?

### Final Verification Steps
```bash
# Run these commands to verify claims in your docs:
grep -r "useMemo\|useCallback" apps/gw2w2w/src/          # Should return nothing
grep -r "fetch.*api.guildwars2.com" apps/service-api/src/  # Should use Service Binding instead
```

## Common Pitfalls to Avoid

### ❌ Don't do this:
- Write docs without reading the code first
- Use hypothetical examples that don't match implementation
- Forget to mention React Compiler rules (critical for frontend)
- Omit placement hints in wrangler.toml explanations
- Assume reader knows Cloudflare-specific terms (KV, R2, Durable Objects)

### ✅ Do this instead:
- Start with a one-sentence purpose statement
- Include local dev commands immediately after
- Add a "Key Files" section with brief descriptions
- Document gotchas as positive lessons learned
- Link to relevant AGENT.md or root README sections

## Quick Reference: Key Patterns

### React Compiler (Frontend)
```tsx
// ❌ Don't do this:
const memoized = useMemo(() => expensiveCalc(), [dep]);

// ✅ The compiler handles it automatically — just write clean code
```

### Service Binding (Workers)
```ts
// ❌ Don't do this:
await fetch('http://localhost:8788/api/guild', { method: 'GET' });

// ✅ Do this:
const response = await ctx.service('service-api').fetch('/gw2/guild/4BBB52AA-…');
```

### Photon WASM Integration
```ts
// Server path (Workers)
import { decode, flip, composite } from '@cf-wasm/photon';

// Browser path (designer)
dynamic import('@silvia-odwyer/photon').then(({ decode, flip }) => {
  const decoded = await decode(pngBuffer);
  const flipped = flip(decoded, FlipForegroundHorizontal);
});
```

### Placement Hints
```toml
# wrangler.toml in service-api only
placement = { hostname = "api.guildwars2.com" }
```

## When to Escalate

If you find:
- ❌ A pattern that contradicts the docs (e.g., `useMemo` is being used)
- ❌ An undocumented critical path (e.g., a major error handling strategy)
- ❌ Outdated information in existing docs (e.g., old Photon package name)

→ Add it to the TODO document with priority level, then discuss with the team.
