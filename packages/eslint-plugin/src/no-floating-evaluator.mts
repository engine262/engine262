import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import { getParserServices } from './utils.mjs';

declare module 'typescript' {
  interface Type {
    typeArguments?: ts.Type[];
  }
}

const rule = {
  meta: {
    messages: {
      floating: 'Evaluator is not stepped. It should be yield* evaluator',
    },
    fixable: 'code',
  },
  create(context) {
    const services = getParserServices(context, 'no-floating-evaluator');
    const checker = services.program.getTypeChecker();
    const GeneratorSymbol = checker.resolveName('Generator', undefined, ts.SymbolFlags.Interface, false);
    const AsyncGeneratorSymbol = checker.resolveName('AsyncGenerator', undefined, ts.SymbolFlags.Interface, false);
    if (!GeneratorSymbol || !AsyncGeneratorSymbol) {
      throw new Error('Cannot find necessary symbols');
    }

    return {
      'ExpressionStatement[expression.type="CallExpression"]':
        (function VisitCallExpression({ expression }) {
          const callNode = services.esTreeNodeToTSNodeMap.get(expression as TSESTree.Node);
          if (!ts.isCallExpression(callNode)) {
            return;
          }
          const callType = checker.getTypeAtLocation(callNode);
          if (callType?.getSymbol() === GeneratorSymbol) {
            context.report({
              node: expression,
              messageId: 'floating',
              * fix(fixer) {
                yield fixer.insertTextBefore(expression, 'yield* ');
              },
            });
          }
        } satisfies Rule.RuleListener['ExpressionStatement']),
    };
  },
} satisfies Rule.RuleModule;

export default rule;
