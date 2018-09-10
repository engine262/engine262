'use strict';

module.exports = {
  extends: 'airbnb',
  parser: 'babel-eslint',
  overrides: [
    {
      files: ['*.js'],
      parserOptions: { sourceType: 'script' },
    },
  ],
  rules: {
    // TODO: turn back on after we fix out ReturnIfAbrupt transform
    'quote-props': ['error', 'consistent'],
    'prefer-const': 'off',
    'strict': ['error', 'global'],
    'prefer-destructuring': 'off',
    'no-multiple-empty-lines': ['error', { maxBOF: 0, max: 2 }],
    'arrow-parens': ['error', 'always'],
    'lines-between-class-members': 'off',
    'max-len': 'off',
    'camelcase': 'off',
    'class-methods-use-this': 'off',
    'no-constant-condition': 'off',
    'no-else-return': 'off',
    'no-lonely-if': 'off',
    'no-param-reassign': 'off',
    'no-restricted-syntax': 'off',
    'no-use-before-define': 'off',
    'no-continue': 'off',
    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',
    'import/no-unresolved': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/no-mutable-exports': 'off',
    'react/destructuring-assignment': 'off',
  },
};
