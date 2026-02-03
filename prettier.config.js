/** @type {import('prettier').Config} */
const prettierConfig = {
  printWidth: 120,
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  quoteProps: 'consistent',
  jsxSingleQuote: false,
};

const config = {
  ...prettierConfig,
};

module.exports = config;
