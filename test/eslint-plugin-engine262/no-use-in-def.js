'use strict';

// https://github.com/eslint/eslint/blob/master/lib/rules/no-use-before-define.js

const SENTINEL_TYPE = /^(?:(?:Function|Class)(?:Declaration|Expression)|ArrowFunctionExpression|CatchClause|ImportDeclaration|ExportNamedDeclaration)$/u;
const FOR_IN_OF_TYPE = /^For(?:In|Of)Statement$/u;

function isInRange(node, location) {
  return node && node.range[0] <= location && location <= node.range[1];
}

function isUsedInDef(reference) {
  const variable = reference.resolved;
  if (!variable || variable.scope !== reference.from) {
    return false;
  }

  let node = variable.identifiers[0].parent;
  const location = reference.identifier.range[1];

  while (node) {
    if (node.type === 'VariableDeclarator') {
      if (isInRange(node.init, location)) {
        return true;
      }
      if (FOR_IN_OF_TYPE.test(node.parent.parent.type) && isInRange(node.parent.parent.right, location)) {
        return true;
      }
      break;
    }

    if (node.type === 'AssignmentPattern' && isInRange(node.right, location)) {
      return true;
    }

    if (SENTINEL_TYPE.test(node.type)) {
      break;
    }

    node = node.parent;
  }

  return false;
}

module.exports = {
  create(context) {
    function findVariablesInScope(scope) {
      scope.references.forEach((reference) => {
        if (isUsedInDef(reference)) {
          context.report({
            node: reference.identifier,
            message: '{{name}} was used in its own definition',
            data: reference.identifier,
          });
        }
      });

      scope.childScopes.forEach((s) => findVariablesInScope(s));
    }

    return {
      Program() {
        findVariablesInScope(context.getScope());
      },
    };
  },
};
