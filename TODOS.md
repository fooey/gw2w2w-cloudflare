# TODOs

_Nothing open._

<!--
Resolved: "Drop the TypeScript 7 alias workaround in apps/gw2w2w".
The workaround existed because Next.js 16's `verify-typescript-setup.js` probed for
`typescript/lib/typescript.js`, which TypeScript 7 no longer ships. Porting the app off Next.js
removed that check, so `apps/gw2w2w` now uses `typescript: catalog:` and plain `tsc` like every
other package — the `@typescript/typescript6` / `typescript7` alias pair is gone.
-->
