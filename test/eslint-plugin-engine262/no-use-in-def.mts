import type { Rule, Scope } from 'eslint';
import type { TSESTree } from '@typescript-eslint/types';
import type * as ESTree from 'estree';

// https://github.com/eslint/eslint/blob/master/lib/rules/no-use-before-define.js

const SENTINEL_TYPE = /^(?:(?:Function|Class)(?:Declaration|Expression)|ArrowFunctionExpression|CatchClause|ImportDeclaration|ExportNamedDeclaration)$/u;
const FOR_IN_OF_TYPE = /^For(?:In|Of)Statement$/u;

function isForInOfStatement(node: TSESTree.Node): node is TSESTree.ForInStatement | TSESTree.ForOfStatement {
  return FOR_IN_OF_TYPE.test(node.type);
}

function isInRange(node: TSESTree.Node | null | undefined, location: number) {
  return !!node && node.range[0] <= location && location <= node.range[1];
}

function isUsedInDef(reference: Scope.Reference) {
  const variable = reference.resolved;
  if (!variable || variable.scope !== reference.from) {
    return false;
  }

  let node = (variable.identifiers[0] as ESTree.Node & Rule.NodeParentExtension).parent as TSESTree.Node | undefined;
  const location = reference.identifier.range![1];

  while (node) {
    if (node.type === 'TSTypeParameter') {
      return false;
    }
    if (node.type === 'VariableDeclarator') {
      if (isInRange(node.init, location)) {
        return true;
      }
      if (isForInOfStatement(node.parent.parent) && isInRange(node.parent.parent.right, location)) {
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

export default {
  create(context) {
    function findVariablesInScope(scope: Scope.Scope) {
      scope.references.forEach((reference) => {
        if (isUsedInDef(reference)) {
          context.report({
            node: reference.identifier,
            message: '{{name}} was used in its own definition',
            data: { name: reference.identifier.name },
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
} satisfies Rule.RuleModule;
