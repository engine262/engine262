'use strict';

/**
 * Checks whether or not a given variable is a function name.
 * @param {eslint-scope.Variable} variable - A variable to check.
 * @returns {boolean} `true` if the variable is a function name.
 */
function isFunctionName(variable) {
  return variable && variable.defs[0].type === 'FunctionName';
}

module.exports = {
  create(context) {
    return {
      'FunctionDeclaration:exit'(node) {
        const nameVar = context.getDeclaredVariables(node)[0];
        if (!isFunctionName(nameVar)) {
          return;
        }
        for (const ref of nameVar.references) {
          if (ref.identifier.range[0] >= node.range[0] && ref.identifier.range[1] <= node.range[1]) {
            context.report({
              node: ref.identifier,
              message: 'Recursive call.'
            });
          }
        }
      }
    };
  }
};
