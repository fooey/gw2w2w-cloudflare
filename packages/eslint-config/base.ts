import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
// @ts-ignore
import turboPlugin from 'eslint-plugin-turbo';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export const config = defineConfig(
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
      // Conflicts with no-non-null-assertion: both can't be satisfied simultaneously
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    plugins: {
      // onlyWarn,
    },
  },
  {
    ignores: ['dist/**'],
  },
);
