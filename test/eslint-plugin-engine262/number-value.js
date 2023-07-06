'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    fixable: 'code',
  },
  create(context) {
    return {
      ImportSpecifier(node) {
        if (node.imported.name === 'F') {
          context.report({
            node,
            message: 'Use 𝔽, not F, to get a NumberValue',
            fix(fixer) {
              return fixer.replaceText(node.imported, '𝔽');
            },
          });
        }
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'F') {
          context.report({
            node: node.callee,
            message: 'Use 𝔽, not F, to get a NumberValue',
            fix(fixer) {
              return fixer.replaceText(node.callee, '𝔽');
            },
          });
        }
      },
    };
  },
};
