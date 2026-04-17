import baseConfig from '@repo/vitest-config/base';
import path from 'path';
import { defineConfig, mergeConfig, type Plugin } from 'vitest/config';

const SERVICE_API_SRC = path.resolve(import.meta.dirname, './src');

/** Resolve Node.js subpath imports (`#*`) to this package's src directory. */
function subpathImportResolver(): Plugin {
  return {
    name: 'subpath-import-resolver',
    resolveId(id, importer) {
      if (!id.startsWith('#') || !importer) return;
      return path.resolve(SERVICE_API_SRC, id.slice(1));
    },
  };
}

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [subpathImportResolver()],
    resolve: {
      alias: [
        // Stub out the Cloudflare Workers runtime module (used by MatchupPoller)
        {
          find: 'cloudflare:workers',
          replacement: path.resolve(import.meta.dirname, './src/__mocks__/cloudflare-workers.ts'),
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
