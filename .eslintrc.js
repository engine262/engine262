module.exports = {
  extends: 'airbnb',
  rules: {
    'no-multiple-empty-lines': ['error', { maxBOF: 0, max: 2 }],
    'arrow-parens': ['error', 'always'],
    'lines-between-class-members': 'off',
    'camelcase': 'off',
    'class-methods-use-this': 'off',
    'no-lonely-if': 'off',
    'no-else-return': 'off',
    'no-restricted-syntax': 'off',
    'no-param-reassign': 'off',
    'no-use-before-define': 'off',
    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',
    'import/no-unresolved': 'off',
    'react/destructuring-assignment': 'off',
  },
};
