// import nextVitals from 'eslint-config-next/core-web-vitals';
// import nextTs from 'eslint-config-next/typescript';
// import { defineConfig, globalIgnores } from 'eslint/config';
import { nextJsConfig } from '@repo/eslint-config/next-js';

// const eslintConfig = defineConfig([
//   ...nextVitals,
//   ...nextTs,
//   // Override default ignores of eslint-config-next.
//   globalIgnores([
//     // Default ignores of eslint-config-next:
//     '.next/**',
//     'out/**',
//     'build/**',
//     'next-env.d.ts',
//   ]),
//   // Custom rule overrides
//   {
//     rules: {
//       '@next/next/no-img-element': 'off',
//     },
//   },
// ]);

export default nextJsConfig;
