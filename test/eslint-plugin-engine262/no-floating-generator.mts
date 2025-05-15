import type { Rule } from 'eslint';
import type { ParserServices } from '@typescript-eslint/parser';
// eslint-disable-next-line import/no-extraneous-dependencies
import ts from 'typescript';

declare module 'typescript' {
  interface Type {
    typeArguments?: ts.Type[];
  }
}

const rule = {
  meta: {
    messages: {
      floating: 'Generator is not stepped. It should be yield* evaluator',
    },
    fixable: 'code',
  },
  create(context) {
    const services = getParserServices(context);
    if (!services.program) {
      throw new Error('No ts program found');
    }
    const checker = services.program.getTypeChecker();
    const GeneratorSymbol = checker.resolveName('Generator', undefined, ts.SymbolFlags.Interface, false);
    const AsyncGeneratorSymbol = checker.resolveName('AsyncGenerator', undefined, ts.SymbolFlags.Interface, false);
    if (!GeneratorSymbol || !AsyncGeneratorSymbol) {
      throw new Error('Cannot find necessary symbols');
    }

    return {
      'ExpressionStatement[expression.type="CallExpression"]':
        (function VisitCallExpression({ expression }) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const callNode = services.esTreeNodeToTSNodeMap.get(expression as any);
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

function getParserServices(context: Rule.RuleContext): ParserServices {
  if (
    context.sourceCode.parserServices?.esTreeNodeToTSNodeMap == null
    || context.sourceCode.parserServices.tsNodeToESTreeNodeMap == null
  ) {
    throw new Error();
  }

  if (context.sourceCode.parserServices.program == null) {
    throw new Error();
  }

  return context.sourceCode.parserServices;
}
