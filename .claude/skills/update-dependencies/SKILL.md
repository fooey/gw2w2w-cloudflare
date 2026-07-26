---
name: update-dependencies
description: Workflow for updating all outdated dependencies across this pnpm-catalog monorepo — classifying cataloged vs non-cataloged packages, running codemods, reviewing changelogs for major/minor bumps, and cleaning up stale pnpm overrides. Use when asked to update dependencies, bump packages, or run a dependency upgrade pass.
---

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
- **Major version bumps require caution.** If `pnpm outdated` shows a major version jump, check the changelog for breaking changes before updating. Flag any breaking changes to the user.
- **Don't update `pnpm` itself via this workflow.** The `packageManager` field in root `package.json` pins the exact pnpm version and should be updated deliberately via `corepack use pnpm@latest`.
- **Overrides are temporary.** Every override should include a GHSA comment explaining why it exists. Remove overrides as soon as the parent dependency ships a fix.
