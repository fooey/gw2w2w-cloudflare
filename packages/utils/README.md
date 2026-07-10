# utils

Shared utility functions used across the monorepo.

## Exports

| Function               | Module                | Description                                                                        |
| ---------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `normalizeGuildName`   | `string.ts`           | Lowercase, trim, normalize spaces/hyphens, strip diacritics                        |
| `validateArenaNetUuid` | `uuid.ts`             | Regex check for GW2's 8-4-4-4-12 hex UUID format                                   |
| `withJitter`           | `network.ts`          | Add random ±10% dispersion to a TTL value                                          |
| `allowedOrigin`        | `routing/security.ts` | CORS origin validator for production domains and localhost                         |
| `allowedCsrf`          | `routing/security.ts` | Strict origin-vs-host CSRF check                                                   |
| `isNil`                | `nullish.ts`          | True when value is null or undefined                                               |
| `isPresent`            | `nullish.ts`          | True when value is neither null nor undefined                                      |
| `isEmpty`              | `nullish.ts`          | True when value is null, undefined, or an empty string                             |
| `isNonEmptyString`     | `nullish.ts`          | True when value is neither null, undefined, nor an empty string                    |
| `isEmptyArray`         | `nullish.ts`          | True when value is null, undefined, or an empty array (plain boolean, not a guard) |
| `isNonEmptyArray`      | `nullish.ts`          | True when value is neither null, undefined, nor an empty array (narrows to `T[]`)  |

## Testing

```sh
pnpm test
```

Tests cover all exported functions with edge cases for unicode normalization, UUID validation, jitter bounds, security origin matching, and nullish/empty-array narrowing (including a type-level regression test for `isNonEmptyArray` against discriminated-union types).
