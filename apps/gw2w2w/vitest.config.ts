import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '@repo/vitest-config/base';

export default mergeConfig(
  baseConfig,
  defineConfig({
    oxc: {
      jsx: { runtime: 'automatic' },
    },
    test: {
      server: {
        deps: {
          // Process workspace packages (TypeScript source, not compiled)
          inline: [/@repo\//u],
        },
      },
    },
  }),
);
