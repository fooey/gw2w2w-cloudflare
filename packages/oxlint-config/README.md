# @repo/oxlint-config

Shared Oxlint presets for this monorepo.

- `base.json`: Shared TypeScript + correctness baseline used by all packages.
- `nextjs-app.json`: Extends base with Next.js, React, and React Compiler rules for `apps/gw2w2w`.
- `service.json`: Extends base for Worker service apps.
- `library.json`: Extends base for shared library packages.

Usage (from a workspace package):

```json
{
  "$schema": "../../node_modules/oxlint/configuration_schema.json",
  "extends": ["../../packages/oxlint-config/service.json"]
}
```
