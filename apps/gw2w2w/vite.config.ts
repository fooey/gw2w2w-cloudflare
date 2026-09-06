import { execSync } from 'node:child_process';

import reactCompiler from '@acusti/vite-plugin-react-compiler';
import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

function gitBuildHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  server: {
    // 3000 rather than Vite's default 5173, to keep existing bookmarks working. strictPort makes a
    // busy port fail loudly instead of silently sliding to 3001 and breaking those bookmarks.
    port: 3000,
    strictPort: true,
    // Bind dual-stack. Vite's default ('localhost') resolves to ::1 only on Windows, so browsers
    // that try 127.0.0.1 first stall ~2s on a dead connection before falling back to IPv6 — which
    // shows up as a slow first render even though the server responds in ~20ms.
    host: '::',
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
  // React Router lazy-loads route modules, so Vite's startup scan can't see deps that only a route
  // imports. Those get discovered as you browse, and each newly-optimized batch forces a full page
  // reload (losing app state). Declaring them here prebundles everything at boot instead — this
  // list is exactly what the dev server reported discovering late.
  optimizeDeps: {
    include: [
      '@headlessui/react',
      '@heroicons/react/20/solid',
      '@heroicons/react/24/outline',
      '@silvia-odwyer/photon',
      '@tanstack/react-query',
      '@tanstack/react-virtual',
      'clsx',
      'hono/client',
      'lodash-es/filter',
      'match-sorter',
      'react/compiler-runtime',
      'recharts',
      'tailwind-merge',
      'zustand',
      'zustand/middleware',
    ],
  },
  plugins: [
    // Runs the server build inside workerd, so loaders see the real bindings in dev.
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    // React Compiler via oxc-transform-react (the Rust port's Node bindings), not Babel. Must run
    // before reactRouter()'s JSX transform — the compiler requires original, untransformed JSX.
    //
    // Client environment only: `react/compiler-runtime` reaches useMemoCache through React's
    // *client* internals dispatcher, which is null while server rendering, so compiled components
    // throw during SSR. Memoization only pays off across client re-renders anyway — SSR is a
    // single pass — and the emitted HTML is identical either way, so hydration is unaffected.
    {
      ...reactCompiler(),
      applyToEnvironment: (environment) => environment.name === 'client',
    },
    reactRouter(),
  ],
  build: {
    // Emitted so Cloudflare can symbolicate production stack traces (paired with
    // upload_source_maps in wrangler.toml). Without these, Workers errors are minified frames.
    sourcemap: true,
  },
  define: {
    // Baked in at build time; read via import.meta.env (see src/vite-env.d.ts for the types).
    'import.meta.env.VITE_BUILD_HASH': JSON.stringify(gitBuildHash()),
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString()),
  },
});
