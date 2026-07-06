import baseConfig from '@repo/vitest-config/base';
import path from 'node:path';
import { defineConfig, mergeConfig, type Plugin } from 'vitest/config';

const SERVICE_API_SRC = path.resolve(import.meta.dirname, './src');

/** Resolve Node.js subpath imports (`#*`) to this package's src directory. */
function subpathImportResolver(): Plugin {
  return {
    name: 'subpath-import-resolver',
    resolveId(id, importer) {
      // Inlined rather than importing @repo/utils's isNonEmptyString — Vitest loads this
      // config file before its own transform pipeline is active, so a workspace-package
      // import here fails Node's native ESM resolution (unlike imports from test/src files).
      return id.startsWith('#') && typeof importer === 'string' && importer.length > 0
        ? path.resolve(SERVICE_API_SRC, id.slice(1))
        : undefined;
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
          inline: [/@repo\//u],
        },
      },
    },
  }),
);
