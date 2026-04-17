import baseConfig from '@repo/vitest-config/base';
import path from 'path';
import { defineConfig, mergeConfig, type Plugin } from 'vitest/config';

const SERVICE_EMBLEM_SRC = path.resolve(import.meta.dirname, './src');
const SERVICE_API_SRC = path.resolve(import.meta.dirname, '../service-api/src');

/**
 * Resolve Node.js subpath imports (`#*`) to the correct package root based on
 * which package the importing file lives in. A simple regex alias would
 * incorrectly redirect service-api's own `#*` imports to service-emblem's src.
 */
function subpathImportResolver(): Plugin {
  return {
    name: 'subpath-import-resolver',
    resolveId(id, importer) {
      if (!id.startsWith('#') || !importer) return;
      const rel = id.slice(1);
      const root = importer.startsWith(SERVICE_API_SRC) ? SERVICE_API_SRC : SERVICE_EMBLEM_SRC;
      return path.resolve(root, rel);
    },
  };
}

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [subpathImportResolver()],
    resolve: {
      alias: [
        // Stub out @cf-wasm/photon (used by emblem-renderer/index.ts) — no actual rendering in tests
        {
          find: '@cf-wasm/photon',
          replacement: path.resolve(import.meta.dirname, './src/__mocks__/cf-wasm-photon.ts'),
        },
      ],
    },
    test: {
      server: {
        deps: {
          inline: [/@repo\//],
        },
      },
    },
  }),
);
