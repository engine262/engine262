'use strict';

const Module = require('module');

const ModuleFindPath = Module._findPath;
const hacks = [
  'eslint-plugin-engine262',
];
Module._findPath = (request, paths, isMain) => {
  const r = ModuleFindPath(request, paths, isMain);
  if (!r && hacks.includes(request)) {
    return require.resolve(`./test/${request}`);
  }
  return r;
};

module.exports = {
  extends: 'airbnb-base',
  plugins: ['engine262'],
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2019,
  },
  overrides: [
    {
      files: ['*.js'],
      parserOptions: { sourceType: 'script' },
    },
  ],
  globals: {
    BigInt: false,
    Atomics: false,
    SharedArrayBuffer: false,
    WeakRef: false,
    globalThis: false,
  },
  rules: {
    'arrow-parens': ['error', 'always'],
    'brace-style': ['error', '1tbs', { allowSingleLine: false }],
    'curly': ['error', 'all'],
    'engine262/no-use-in-def': 'error',
    'engine262/valid-throw': 'error',
    'import/order': ['error', { 'newlines-between': 'never' }],
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'no-multiple-empty-lines': ['error', { maxBOF: 0, max: 2 }],
    'no-unused-vars': ['error', {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_',
    }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'quote-props': ['error', 'consistent'],
    'strict': ['error', 'global'],

    'camelcase': 'off',
    'class-methods-use-this': 'off',
    'global-require': 'off',
    'import/extensions': 'off',
    'import/no-cycle': 'off',
    'import/no-mutable-exports': 'off',
    'import/prefer-default-export': 'off',
    'lines-between-class-members': 'off',
    'max-classes-per-file': 'off',
    'max-len': 'off',
    'no-bitwise': 'off',
    'no-constant-condition': 'off',
    'no-continue': 'off',
    'no-else-return': 'off',
    'no-lonely-if': 'off',
    'no-param-reassign': 'off',
    'no-restricted-syntax': 'off',
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off',
    'prefer-destructuring': 'off',
  },
};
