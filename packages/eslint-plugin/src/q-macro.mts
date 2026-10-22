import { dirname, resolve } from 'node:path';
import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import type * as ESTree from 'estree';
import ts from 'typescript';
import { analyzeQMacroTransformations } from '@engine262/babel-compiler';
import { addNamedImports, getEngine262Settings, getParserServices } from './utils.mjs';

declare module 'typescript' {
  interface Type {
    // typescript internal API
    typeArguments?: ts.Type[];
  }
}

const rule = {
  meta: {
    messages: {
      noAbruptCompletion: 'The function return type does not include AbruptCompletion',
      noThrowCompletion: 'The function return type does not include ThrowCompletion',
      evaluator: 'It should be Q(yield* evaluator) instead of Q(evaluator)',
      cannotTransform: '{{ reason }}',
    },
    fixable: 'code',
  },
  create(context) {
    const services = getParserServices(context, 'q-macro');
    const checker = services.program.getTypeChecker();
    const settings = getEngine262Settings(context);
    const { valueDefinitionPath } = settings;
    const valueFile = valueDefinitionPath
      ? services.program.getSourceFile(valueDefinitionPath)
      : undefined;
    const completionFile = valueDefinitionPath
      ? services.program.getSourceFile(resolve(dirname(valueDefinitionPath), 'completion.mts'))
      : undefined;
    const evaluatorFile = valueDefinitionPath
      ? services.program.getSourceFile(resolve(dirname(valueDefinitionPath), 'evaluator.mts'))
      : undefined;
    const promiseFile = valueDefinitionPath
      ? services.program.getSourceFile(resolve(dirname(valueDefinitionPath), 'intrinsics/Promise.mts'))
      : undefined;
    const Value = findDeclaration(services.program, 'Value', ts.isTypeAliasDeclaration, valueFile);
    const AbruptCompletion = findDeclaration(services.program, 'AbruptCompletion', ts.isTypeAliasDeclaration, completionFile);
    const ThrowCompletion = findDeclaration(services.program, 'ThrowCompletion', ts.isTypeAliasDeclaration, completionFile);
    const EvaluatorYieldType = findDeclaration(services.program, 'EvaluatorYieldType', ts.isTypeAliasDeclaration, evaluatorFile);
    const EvaluatorNextType = findDeclaration(services.program, 'EvaluatorNextType', ts.isTypeAliasDeclaration, evaluatorFile);
    const PromiseObject = findDeclaration(services.program, 'PromiseObject', ts.isInterfaceDeclaration, promiseFile);
    const GeneratorSymbol = checker.resolveName('Generator', undefined, ts.SymbolFlags.Interface, false);
    if (
      !Value
      || !AbruptCompletion
      || !PromiseObject
      || !ThrowCompletion
      || !EvaluatorYieldType
      || !EvaluatorNextType
      || !GeneratorSymbol
    ) {
      throw new Error('Cannot find necessary symbols');
    }
    const ValueType = checker.getTypeAtLocation(Value);
    const AbruptCompletionType = checker.getTypeAtLocation(AbruptCompletion);
    const ThrowCompletionType = checker.getTypeAtLocation(ThrowCompletion);
    const EvaluatorYieldTypeType = checker.getTypeAtLocation(EvaluatorYieldType);
    const EvaluatorNextTypeType = checker.getTypeAtLocation(EvaluatorNextType);
    const PromiseObjectType = checker.getTypeAtLocation(PromiseObject);
    const reported = new WeakSet();
    const macroAnalysis = analyzeQMacroTransformations(
      context.sourceCode.ast,
      context.sourceCode.visitorKeys,
    );
    const macroCalls = new Set(
      [...macroAnalysis.plans, ...macroAnalysis.diagnostics]
        .map(({ start, end }) => `${start}:${end}`),
    );
    const untransformableMacros = new Set(
      macroAnalysis.diagnostics.map(({ start, end }) => `${start}:${end}`),
    );

    return {
      Program() {
        for (const diagnostic of macroAnalysis.diagnostics) {
          context.report({
            loc: {
              start: context.sourceCode.getLocFromIndex(diagnostic.start),
              end: context.sourceCode.getLocFromIndex(diagnostic.end),
            },
            messageId: 'cannotTransform',
            data: { reason: diagnostic.message },
          });
        }
      },
      // eslint-disable-next-line func-names
      "CallExpression[callee.name='Q'],[callee.name='ReturnIfAbrupt'],[callee.name='IfAbruptRejectPromise'],[callee.name='IfAbruptCloseIterator']":
        (function (node) { // eslint-disable-line func-names
          const firstArg = node.arguments[0];
          const call = services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node);
          if (!ts.isCallExpression(call)) return;
          const macroKey = `${call.getStart()}:${call.getEnd()}`;
          if (!macroCalls.has(macroKey) || untransformableMacros.has(macroKey)) return;

          // Transformability diagnostics are produced by the compiler's syntax-only analysis.
          if (firstArg?.type === 'SpreadElement') {
            return;
          }

          const containingFunction = ts.findAncestor(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node), ts.isFunctionLike);
          if (!containingFunction || !isFunctionLikeDeclaration(containingFunction)) {
            return;
          }

          // fix Q(evaluator) to Q(yield* evaluator)
          const firstArgType = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(firstArg as TSESTree.Node));
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
          if (containingFunctionType.flags & ts.TypeFlags.Any) {
            return;
          }

          let functionReturnType = containingFunctionType.getCallSignatures().at(-1)?.getReturnType();
          // read type from contextual object
          // e.g.
          // interface T { f(): ValueCompletion }
          // const obj: T = { f() { Q(yield* evaluator); } }
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
                functionReturnType = contextualPropertyType.getCallSignatures().at(-1)?.getReturnType();
              }
            }
          }
          if (!functionReturnType) {
            throw new Error('Cannot find return type');
          }
          const generatorTypeArguments = functionReturnType.getSymbol() === GeneratorSymbol
            ? functionReturnType.typeArguments
            : undefined;
          const isGenerator = generatorTypeArguments !== undefined;
          const returnType = generatorTypeArguments?.[1] ?? functionReturnType;

          const f = (node.callee as ESTree.Identifier).name;
          let ExpectedReturnType;
          if (checker.isTypeAssignableTo(AbruptCompletionType, firstArgType)) {
            ExpectedReturnType = AbruptCompletionType;
          }
          if (checker.isTypeAssignableTo(ThrowCompletionType, firstArgType)) {
            ExpectedReturnType = ThrowCompletionType;
          }
          if (f === 'IfAbruptRejectPromise') {
            ExpectedReturnType = PromiseObjectType;
          }
          if (!ExpectedReturnType) return;
          if (reported.has(containingFunction)) return;
          reported.add(containingFunction);
          if (!checker.isTypeAssignableTo(ExpectedReturnType, returnType)) {
            const annotation = returnTypeAnnotation(
              checker,
              containingFunction,
              returnType,
              isGenerator,
              isGenerator
                && generatorTypeArguments.length >= 3
                && sameType(checker, generatorTypeArguments[0], EvaluatorYieldTypeType)
                && sameType(checker, generatorTypeArguments[2], EvaluatorNextTypeType),
              sameType(checker, returnType, ValueType),
            );
            context.report({
              node,
              messageId: ExpectedReturnType === AbruptCompletionType ? 'noAbruptCompletion' : 'noThrowCompletion',
              fix: containsAbsoluteModuleImport(annotation.text)
                ? undefined
                : function* (fixer) {
                    const returnTypeFix = replaceFunctionReturnType(
                      fixer,
                      containingFunction,
                      annotation.text,
                    );
                    if (returnTypeFix) yield returnTypeFix;
                    if (!checker.resolveName(annotation.wrapper, containingFunction, ts.SymbolFlags.Type, false)) {
                      const importFix = addNamedImports(
                        containingFunction.getSourceFile(),
                        settings.internals,
                        [annotation.wrapper],
                        fixer,
                        true,
                      );
                      if (importFix) yield importFix;
                    }
                  },
            });
          }
        } satisfies Rule.RuleListener['CallExpression']),
    };
  },
} satisfies Rule.RuleModule;

export default rule;

function findDeclaration<T extends ts.TypeAliasDeclaration | ts.InterfaceDeclaration>(
  program: ts.Program,
  name: string,
  isDeclaration: (statement: ts.Statement) => statement is T,
  preferredFile?: ts.SourceFile,
): T | undefined {
  const findIn = (sourceFile: ts.SourceFile): T | undefined => sourceFile.statements.find(
    (statement): statement is T => isDeclaration(statement) && statement.name.text === name,
  );
  const preferred = preferredFile && findIn(preferredFile);
  if (preferred) return preferred;
  for (const sourceFile of program.getSourceFiles()) {
    const declaration = findIn(sourceFile);
    if (declaration) return declaration;
  }
  return undefined;
}

type CompletionWrapper = 'PlainCompletion' | 'PlainEvaluator' | 'ValueCompletion' | 'ValueEvaluator';

function returnTypeAnnotation(
  checker: ts.TypeChecker,
  containingFunction: ts.FunctionLikeDeclaration,
  returnType: ts.Type,
  isGenerator: boolean,
  isEvaluator: boolean,
  isValue: boolean,
): { readonly text: string; readonly wrapper: CompletionWrapper } {
  if (isValue && !isGenerator) {
    return { text: 'ValueCompletion', wrapper: 'ValueCompletion' };
  }
  if (isValue && isEvaluator) {
    return { text: 'ValueEvaluator', wrapper: 'ValueEvaluator' };
  }
  const wrapper = isGenerator ? 'PlainEvaluator' : 'PlainCompletion';
  const type = printableType(checker, returnType, containingFunction)
    ?? '/* a type cannot be named */ never';
  return { text: `${wrapper}<${type}>`, wrapper };
}

function printableType(
  checker: ts.TypeChecker,
  type: ts.Type,
  containingFunction: ts.FunctionLikeDeclaration,
): string | undefined {
  if (!isTypeNameable(checker, type, containingFunction)) return undefined;
  const typeNode = checker.typeToTypeNode(
    type,
    containingFunction,
    ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.WriteTypeArgumentsOfSignature,
  );
  if (!typeNode) return undefined;
  return ts.createPrinter().printNode(
    ts.EmitHint.Unspecified,
    typeNode,
    containingFunction.getSourceFile(),
  );
}

const primitiveTypeFlags =
  ts.TypeFlags.Any
  | ts.TypeFlags.Unknown
  | ts.TypeFlags.String
  | ts.TypeFlags.Number
  | ts.TypeFlags.Boolean
  | ts.TypeFlags.BigInt
  | ts.TypeFlags.ESSymbol
  | ts.TypeFlags.Void
  | ts.TypeFlags.Undefined
  | ts.TypeFlags.Null
  | ts.TypeFlags.Never
  | ts.TypeFlags.StringLiteral
  | ts.TypeFlags.NumberLiteral
  | ts.TypeFlags.BigIntLiteral
  | ts.TypeFlags.BooleanLiteral;

function isTypeNameable(
  checker: ts.TypeChecker,
  type: ts.Type,
  containingFunction: ts.FunctionLikeDeclaration,
  seen = new Set<ts.Type>(),
): boolean {
  if (seen.has(type)) return true;
  seen.add(type);
  if (type.flags & primitiveTypeFlags) return true;
  if (type.isUnionOrIntersection()) {
    return type.types.every((part) => isTypeNameable(checker, part, containingFunction, seen));
  }
  const symbol = type.aliasSymbol ?? type.getSymbol();
  if (!symbol || !checker.symbolToEntityName(symbol, ts.SymbolFlags.Type, containingFunction, undefined)) {
    return false;
  }
  const typeArguments = type.aliasTypeArguments ?? type.typeArguments ?? [];
  return typeArguments.every((argument) => (
    isTypeNameable(checker, argument, containingFunction, seen)
  ));
}

function sameType(checker: ts.TypeChecker, left: ts.Type, right: ts.Type): boolean {
  return checker.isTypeAssignableTo(left, right) && checker.isTypeAssignableTo(right, left);
}

function containsAbsoluteModuleImport(text: string): boolean {
  return /\bimport\(\s*["'](?:\/|[A-Za-z]:[\\/])/.test(text);
}

function isFunctionLikeDeclaration(node: ts.SignatureDeclaration): node is ts.FunctionLikeDeclaration {
  return ts.isFunctionDeclaration(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node);
}

function replaceFunctionReturnType(
  fixer: Rule.RuleFixer,
  containingFunction: ts.FunctionLikeDeclaration,
  returnType: string,
): Rule.Fix | undefined {
  if (containingFunction.type) {
    return fixer.replaceTextRange(
      [containingFunction.type.getStart(), containingFunction.type.getEnd()],
      returnType,
    );
  }
  if (ts.isArrowFunction(containingFunction)) {
    const position = containingFunction.equalsGreaterThanToken.getFullStart();
    return fixer.insertTextBeforeRange([position, position], `: ${returnType}`);
  }
  if (containingFunction.body) {
    const position = containingFunction.body.getFullStart();
    return fixer.insertTextBeforeRange([position, position], `: ${returnType}`);
  }
  return undefined;
}
