import baseConfig from '@repo/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    esbuild: {
      jsx: 'automatic',
    },
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
