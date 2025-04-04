'use strict';

const { resolve } = require('node:path');
// eslint-disable-next-line import/no-extraneous-dependencies
const ts = require('typescript');

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    messages: {
      noAbruptCompletion: 'The function return type does not include AbruptCompletion',
      noThrowCompletion: 'The function return type does not include ThrowCompletion',
      noNeedToUseQ: 'Unnecessary Q() call',
      evaluator: 'It should be Q(yield* evaluator) instead of Q(evaluator)',
    },
    fixable: 'code',
  },
  create(context) {
    const services = getParserServices(context);
    if (!services.program) {
      throw new Error('No ts program found');
    }
    const checker = services.program.getTypeChecker();
    const CompletionFile = services.program.getSourceFile(resolve(__dirname, '../../src/completion.mts'));
    const PromiseFile = services.program.getSourceFile(resolve(__dirname, '../../src/intrinsics/Promise.mts'));
    if (!CompletionFile || !PromiseFile) {
      throw new Error('Cannot load src/completion.mts or src/intrinsics/Promise.mts');
    }
    const AbruptCompletion = CompletionFile.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === 'AbruptCompletion');
    const ThrowCompletion = CompletionFile.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === 'ThrowCompletion');
    const PromiseObject = PromiseFile.statements.find((s) => ts.isInterfaceDeclaration(s) && s.name.text === 'PromiseObject');
    const GeneratorSymbol = checker.resolveName('Generator', undefined, ts.SymbolFlags.Interface, false);
    if (!AbruptCompletion || !PromiseObject || !ThrowCompletion || !GeneratorSymbol) {
      throw new Error('Cannot find necessary symbols');
    }
    const AbruptCompletionType = checker.getTypeAtLocation(AbruptCompletion);
    const ThrowCompletionType = checker.getTypeAtLocation(ThrowCompletion);
    const PromiseObjectType = checker.getTypeAtLocation(PromiseObject);
    const reported = new WeakSet();

    return {
      // eslint-disable-next-line func-names
      "CallExpression[callee.name='Q'],[callee.name='ReturnIfAbrupt'],[callee.name='IfAbruptRejectPromise'],[callee.name='IfAbruptCloseIterator']":
        /** @type {import('eslint').Rule.NodeListener['CallExpression']} */
        (function (node) {
          const firstArg = node.arguments[0];
          if (firstArg?.type === 'SpreadElement') {
            return;
          }

          const containingFunction = ts.findAncestor(services.esTreeNodeToTSNodeMap.get(node), ts.isFunctionLike);
          if (!containingFunction) {
            throw new Error('Cannot find containing function');
          }

          const firstArgType = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(firstArg));
          if (firstArgType?.getSymbol() === GeneratorSymbol) {
            context.report({
              node,
              messageId: 'evaluator',
              * fix(fixer) {
                yield fixer.insertTextBefore(firstArg, 'yield* ');
              },
            });
          }
          const containingFunctionType = checker.getTypeAtLocation(containingFunction);
          if ((containingFunctionType.flags & ts.TypeFlags.Any) || (containingFunctionType.flags & ts.TypeFlags.Any)) {
            throw new Error('Unexpected any');
          }

          let returnType = containingFunctionType.getCallSignatures().at(-1)?.getReturnType();
          if (ts.isMethodDeclaration(containingFunction) && ts.isIdentifier(containingFunction.name) && ts.isExpression(containingFunction.parent)) {
            const contextualObjectType = checker.getContextualType(containingFunction.parent);
            const currentFunctionName = containingFunction.name;
            if (contextualObjectType) {
              const contextualPropertySymbol = contextualObjectType.getProperty(currentFunctionName.text);
              if (contextualPropertySymbol) {
                let contextualPropertyType = checker.getTypeOfSymbol(contextualPropertySymbol);
                if (contextualPropertyType.isUnion()) {
                  const excludeUndefined = contextualPropertyType.types.find((x) => x.flags & ~ts.TypeFlags.Undefined);
                  if (excludeUndefined) {
                    contextualPropertyType = excludeUndefined;
                  }
                }
                returnType = contextualPropertyType.getCallSignatures().at(-1)?.getReturnType();
                // returnType && console.log('returnType', checker.typeToString(returnType));
              }
            }
          }
          // internal api. no api to insatiate the global Generator type.
          if (returnType?.getSymbol() === GeneratorSymbol && returnType?.typeArguments?.[1]) {
            returnType = returnType.typeArguments[1];
          }
          if (!returnType) {
            throw new Error('Cannot find return type');
          }

          const f = /** @type {import('estree').Identifier} */ (node.callee).name;
          let ExpectedReturnType;
          // const ExpectedReturnType = f === 'IfAbruptRejectPromise' ? PromiseObjectType : AbruptCompletionType;
          if (checker.isTypeAssignableTo(AbruptCompletionType, firstArgType)) {
            ExpectedReturnType = AbruptCompletionType;
          }
          if (checker.isTypeAssignableTo(ThrowCompletionType, firstArgType)) {
            ExpectedReturnType = ThrowCompletionType;
          }
          if (f === 'IfAbruptRejectPromise') {
            ExpectedReturnType = PromiseObjectType;
          }
          if (!ExpectedReturnType) {
            // context.report({
            //   node,
            //   messageId: 'noNeedToUseQ',
            // });
            return;
          }
          if (reported.has(containingFunction)) {
            return;
          }
          reported.add(containingFunction);
          if (!checker.isTypeAssignableTo(ExpectedReturnType, returnType)) {
            context.report({
              node,
              messageId: ExpectedReturnType === AbruptCompletionType ? 'noAbruptCompletion' : 'noThrowCompletion',
            });
          }
        }),
    };
  },
};

module.exports = rule;

/**
 * @returns {import('@typescript-eslint/parser').ParserServices}
 */
function getParserServices(context) {
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
