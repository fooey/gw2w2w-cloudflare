import pluginNext from '@next/eslint-plugin-next';
import pluginReact from '@eslint-react/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import pluginReactCompiler from 'eslint-plugin-react-compiler';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { config as baseConfig } from './base.js';

export const nextJsConfig = defineConfig(
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    ...pluginReact.configs['recommended-type-checked'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      '@next/next': pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
  {
    plugins: {
      'react-hooks': pluginReactHooks as any,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      '@next/next/no-img-element': 'off',
    },
  },
  {
    plugins: {
      'react-compiler': pluginReactCompiler,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },
);
