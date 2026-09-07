import type { Config } from '@react-router/dev/config';

export default {
  // Keep the existing `src/` layout rather than React Router's default `app/`, so the
  // `#*` subpath imports in package.json keep resolving unchanged.
  appDirectory: 'src',
  ssr: true,
} satisfies Config;
