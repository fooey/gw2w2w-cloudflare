---
name: address-pr-review-comments
description: Workflow for triaging and addressing GitHub pull request review comments — retrieving unresolved threads via the GitHub GraphQL API, deduplicating repeated feedback, checking whether comments are outdated, and fixing in dependency order. Use when asked to address, resolve, or work through PR review comments.
---

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

**4. Check the current file state.** Comments reference the diff at review time. `isOutdated == true` means the diff has moved. Always read the file's current contents before assuming an unresolved comment still applies.

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
