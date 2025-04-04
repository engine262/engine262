'use strict';

// TODO:
// - Any spec object must inherit from OrdinaryObject or ExoticObject.
// - JSString | SymbolValue => PropertyKeyValue
// - NormalCompletion<T> | ThrowCompletion => PlainCompletion<T>
// - PlainCompletion<Value> => ExpressionCompletion
module.exports = {
  root: true,
  extends: 'airbnb-base',
  plugins: ['@engine262', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./src/tsconfig.json', './test/tsconfig.json', './scripts/tsconfig.json', './lib-src/node/tsconfig.json', './lib-src/inspector/tsconfig.json'],
  },
  overrides: [
    {
      files: ['*.js'],
      parserOptions: { sourceType: 'script', project: null },
    },
    {
      files: ['src/**/*.mts'],
      rules: {
        '@engine262/safe-function-with-q': 'error',
      },
    },
    {
      files: ['*.mts'],
      extends: 'plugin:@typescript-eslint/recommended',
      rules: {
        // TODO: enable this rule after upgrade eslint
        // '@stylistic/padding-line-between-statements': ['error', {
        //   blankLine: 'always',
        //   prev: '*',
        //   next: ['interface', 'type'],
        // }],
        // checked by tsc.
        '@typescript-eslint/no-unused-vars': 'off',
        'no-redeclare': 'off',
        'import/export': 'off',
        'no-dupe-class-members': 'off',
        // false positive
        'no-shadow': 'off',
        // we need it for now
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        // spec convention
        '@typescript-eslint/no-this-alias': 'off',
      },
    },
  ],
  globals: {
    globalThis: false,
    Atomics: false,
    BigInt: false,
    BigUint64Array: false,
    SharedArrayBuffer: false,
  },
  rules: {
    '@engine262/no-use-in-def': 'error',
    '@engine262/valid-feature': 'error',
    '@engine262/mathematical-value': 'error',
    'arrow-parens': ['error', 'always'],
    'brace-style': ['error', '1tbs', { allowSingleLine: false }],
    'curly': ['error', 'all'],
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
    'no-constructor-return': 'off',
    'quote-props': ['error', 'consistent'],
    'strict': ['error', 'global'],
    'default-param-last': 'off',
    'camelcase': 'off',
    'class-methods-use-this': 'off',
    'global-require': 'off',
    'import/extensions': 'off',
    'import/named': 'off',
    'import/no-unresolved': 'off',
    'import/no-cycle': 'off',
    'import/no-mutable-exports': 'off',
    'import/prefer-default-export': 'off',
    '@stylistic/eslint-plugin-js/lines-between-class-members': 'off',
    'max-classes-per-file': 'off',
    'max-len': 'off',
    'no-bitwise': 'off',
    'no-constant-condition': 'off',
    'no-continue': 'off',
    'no-else-return': 'off',
    'no-lonely-if': 'off',
    'no-loop-func': 'off',
    'no-param-reassign': 'off',
    'no-restricted-syntax': 'off',
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off',
    'prefer-destructuring': 'off',
    'require-yield': 'off',
  },
};
