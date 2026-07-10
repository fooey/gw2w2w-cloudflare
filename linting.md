# Linting Guide

This repository uses OXC as the primary lint and format toolchain.

## Primary Tools

- Linter: `oxlint`
- Type-aware rules: `oxlint --type-aware` with `oxlint-tsgolint`
- Formatter: `oxfmt` with `sortTailwindcss: true`
- Orchestration: Turborepo tasks from root `package.json`

## Command Surface

- `pnpm lint` -> `turbo run lint --log-order stream` (type-aware by default)
- `pnpm lint:watch` -> `turbo watch lint` (continuous reruns on file changes)
- `pnpm format` -> `oxfmt --config oxfmt.json .`
- `pnpm ci:all` -> `ci:format && ci:lint && ci:types && ci:boundaries && ci:test && ci:audit`

`ci:format` intentionally runs direct `oxfmt --check` (not Turbo) so root-level files and packages without `format` tasks are still validated.

## Config Layout

- Root baseline: `.oxlintrc.json`
- Shared presets: `packages/oxlint-config/`
  - `base.json`
  - `nextjs-app.json`
  - `service.json`
  - `library.json`
- Package-level configs extend one of the shared presets.

## Rule Ownership by Package Type

- Next app (`apps/gw2w2w`): React + Next + React Compiler, all via native oxlint plugins.
- Services (`apps/service-api`, `apps/service-emblem`): base + Node safety rules.
- Libraries (`packages/*` runtime libs): base + Node safety rules.

## Current Parity Notes

- Strong parity: TypeScript strictness, core correctness, Next coverage, import/promise/vitest subsets.
- Improved parity: service/library Node rules.
- Partial parity remains: full breadth of historical ESLint React bundles is not fully mirrored 1:1.

## Safe Rule Rollout Workflow

1. Add rules as `warn` first unless clearly correctness-critical.
2. Run `pnpm lint`.
3. If clean or low-noise, promote to `error` where appropriate.
4. Run `pnpm ci:all` before finalizing.

## Temporary Probe Workflow (Rule Verification)

Use this when validating that a new rule actually fires:

1. Add a small temporary file in the relevant package `src` tree.
2. Intentionally violate the target rule(s).
3. Run the narrow lint command for the package or `pnpm lint`.
4. Confirm expected rule IDs appear in diagnostics.
5. Delete the temporary file.
6. Re-run `pnpm lint` and `pnpm ci:all` to ensure a clean final state.

Do not keep probe files or suppressions after validation.
