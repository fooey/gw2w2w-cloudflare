import baseConfig from '@repo/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      server: {
        deps: {
          // Process workspace packages (TypeScript source, not compiled)
          inline: [/@repo\//],
        },
      },
    },
  }),
);
