# utils

Shared utility functions used across the monorepo.

## Exports

| Function               | Module                | Description                                                 |
| ---------------------- | --------------------- | ----------------------------------------------------------- |
| `normalizeGuildName`   | `string.ts`           | Lowercase, trim, normalize spaces/hyphens, strip diacritics |
| `validateArenaNetUuid` | `uuid.ts`             | Regex check for GW2's 8-4-4-4-12 hex UUID format            |
| `withJitter`           | `network.ts`          | Add random ±10% dispersion to a TTL value                   |
| `allowedOrigin`        | `routing/security.ts` | CORS origin validator for production domains and localhost  |
| `allowedCsrf`          | `routing/security.ts` | Strict origin-vs-host CSRF check                            |

## Testing

```sh
pnpm test
```

Tests cover all exported functions with edge cases for unicode normalization, UUID validation, jitter bounds, and security origin matching.
