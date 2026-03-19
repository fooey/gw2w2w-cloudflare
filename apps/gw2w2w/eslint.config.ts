// import nextVitals from 'eslint-config-next/core-web-vitals';
// import nextTs from 'eslint-config-next/typescript';
// import { defineConfig, globalIgnores } from 'eslint/config';
import type { Linter } from 'eslint';
import { nextJsConfig } from '../../packages/eslint-config/next';

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

const config: Linter.Config[] = [
  ...nextJsConfig,
  {
    files: ['**/actions.ts', '**/actions/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },
] as Linter.Config[];

export default config;
