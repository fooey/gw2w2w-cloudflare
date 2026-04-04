import pluginReact from '@eslint-react/eslint-plugin';
import { defineConfig } from 'eslint/config';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { config as baseConfig } from './base.js';

export const config = defineConfig(
  ...baseConfig,
  pluginReact.configs['recommended-type-checked'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    plugins: {
      'react-hooks': pluginReactHooks as any,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
    },
  },
);
