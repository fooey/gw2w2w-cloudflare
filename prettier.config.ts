import type { Config } from 'prettier';

const prettierConfig: Config = {
  printWidth: 160,
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  quoteProps: 'consistent',
  jsxSingleQuote: false,
};

const config: Config = {
  ...prettierConfig,
  plugins: ['prettier-plugin-tailwindcss'],
};

module.exports = config;
