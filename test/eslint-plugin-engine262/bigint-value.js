'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    fixable: 'code',
  },
  create(context) {
    return {
      ImportSpecifier(node) {
        if (node.imported.name === 'Z') {
          context.report({
            node,
            message: 'Use ℤ, not Z, to get a BigIntValue',
            fix(fixer) {
              return fixer.replaceText(node.imported, 'ℤ');
            },
          });
        }
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'Z') {
          context.report({
            node: node.callee,
            message: 'Use ℤ, not Z, to get a BigIntValue',
            fix(fixer) {
              return fixer.replaceText(node.callee, 'ℤ');
            },
          });
        }
      },
    };
  },
};
