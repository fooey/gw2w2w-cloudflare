# TODOs

## Drop the TypeScript 7 alias workaround in apps/gw2w2w

**Where:** [apps/gw2w2w/package.json](apps/gw2w2w/package.json)

Next.js 16.2.6's TypeScript detection (`verify-typescript-setup.js`) hardcodes a check for
`typescript/lib/typescript.js`, which no longer exists in TypeScript 7's package layout (the old
JS compiler API ships again in 7.1). Without a workaround, `next build` treats `typescript` as
missing and reinstalls the whole workspace on every build — and hard-fails in CI, since the
`isCI` branch throws instead of auto-installing.

Current workaround (`apps/gw2w2w/package.json` devDependencies):

- `typescript` aliased to `npm:@typescript/typescript6@^6.0.2` (satisfies Next's stale check)
- `typescript7` aliased to `npm:typescript@^7.0.2` (the real native compiler)
- `check-types`/`build` scripts call `node ./node_modules/typescript7/bin/tsc` directly to avoid
  a `.bin/tsc` collision between the two aliases

Next.js merged an official fix (`experimental.useTypeScriptCli`) into `canary` on 2026-07-10
(PR [vercel/next.js#95639](https://github.com/vercel/next.js/pull/95639)), landing after
`16.3.0-canary.82`. **Once a released Next.js version includes this**, revert `apps/gw2w2w` to
match the rest of the monorepo:

```json
"typescript": "catalog:"
```

and change `check-types`/`build` scripts back to plain `tsc --noEmit --checkers 4`, dropping the
`typescript7` alias entirely.
