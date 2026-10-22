import path from 'node:path';
import ts from 'typescript';
import { isGCRelevant, type GCTypeOptions } from './gc-types.mjs';
import { isIdentifierReference } from './gc-analysis.mjs';

export interface BuiltinFunctionAnalysisOptions extends GCTypeOptions {
  readonly program: ts.Program;
}

export interface BuiltinFunctionCaptureReference {
  readonly symbol: ts.Symbol;
  readonly expression: ts.Expression;
  readonly path: readonly string[];
  readonly displayName: string;
}

export interface BuiltinFunctionCallAnalysis {
  readonly name: 'CreateBuiltinFunction' | 'CreateBuiltinFunction.from';
  readonly call: ts.CallExpression;
  readonly closure: ts.FunctionLikeDeclaration | undefined;
  readonly references: readonly BuiltinFunctionCaptureReference[];
  readonly options: ts.ObjectLiteralExpression | undefined;
  readonly captures: ts.ObjectLiteralElementLike | undefined;
  readonly canAutoInsert: boolean;
}

export interface JobCallAnalysis {
  readonly call: ts.NewExpression;
  readonly closure: ts.FunctionLikeDeclaration | undefined;
  readonly references: readonly BuiltinFunctionCaptureReference[];
  readonly options: ts.ObjectLiteralExpression | undefined;
  readonly captures: ts.ObjectLiteralElementLike | undefined;
  readonly canAutoInsert: boolean;
}

export interface IteratorClosureCallAnalysis {
  readonly call: ts.CallExpression;
  readonly closure: ts.FunctionLikeDeclaration | undefined;
  readonly references: readonly BuiltinFunctionCaptureReference[];
  readonly options: ts.ObjectLiteralExpression | undefined;
  readonly captures: ts.ObjectLiteralElementLike | undefined;
  readonly canAutoInsert: boolean;
}

/** Finds CreateBuiltinFunction calls whose closure captures can be analyzed. */
export function analyzeBuiltinFunctionCalls(
  fileName: string,
  options: BuiltinFunctionAnalysisOptions,
): readonly BuiltinFunctionCallAnalysis[] {
  const sourceFile = findSourceFile(options.program, fileName);
  if (!sourceFile) {
    throw new Error(`@engine262/babel-compiler: ${fileName} is not part of the supplied TypeScript Program`);
  }
  const checker = options.program.getTypeChecker();
  const calls: BuiltinFunctionCallAnalysis[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const factory = parseBuiltinFunctionFactory(node.expression, checker);
      if (factory) {
        const optionsArgument = node.arguments[factory.optionsArgument];
        const optionsObject = optionsArgument && ts.isObjectLiteralExpression(optionsArgument)
          ? optionsArgument
          : undefined;
        const closure = resolveClosure(node, factory, optionsObject, checker);
        const references = collectGCReferences(closure, checker, options);
        calls.push({
          name: factory.name,
          call: node,
          closure,
          references,
          options: optionsObject,
          captures: optionsObject && getProperty(optionsObject, 'captures'),
          canAutoInsert: !!closure && canAutoInsert(node, factory, optionsObject, closure),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
}

/** Finds Job constructions whose evaluate closure captures can be analyzed. */
export function analyzeJobCreations(
  fileName: string,
  options: BuiltinFunctionAnalysisOptions,
): readonly JobCallAnalysis[] {
  const sourceFile = findSourceFile(options.program, fileName);
  if (!sourceFile) {
    throw new Error(`@engine262/babel-compiler: ${fileName} is not part of the supplied TypeScript Program`);
  }
  const checker = options.program.getTypeChecker();
  const jobs: JobCallAnalysis[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isNewExpression(node) && isJobConstructor(node.expression, checker)) {
      const optionsArgument = node.arguments?.[0];
      const optionsObject = optionsArgument && ts.isObjectLiteralExpression(optionsArgument)
        ? optionsArgument
        : undefined;
      const evaluate = optionsObject && getProperty(optionsObject, 'evaluate');
      const closure = resolveFunctionDeclaration(evaluate && propertyValue(evaluate), checker);
      jobs.push({
        call: node,
        closure,
        references: collectGCReferences(closure, checker, options),
        options: optionsObject,
        captures: optionsObject && getProperty(optionsObject, 'captures'),
        canAutoInsert: !!closure && !!optionsObject,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return jobs;
}

/** Finds CreateIteratorFromClosure calls whose closure captures can be analyzed. */
export function analyzeIteratorClosureCalls(
  fileName: string,
  options: BuiltinFunctionAnalysisOptions,
): readonly IteratorClosureCallAnalysis[] {
  const sourceFile = findSourceFile(options.program, fileName);
  if (!sourceFile) {
    throw new Error(`@engine262/babel-compiler: ${fileName} is not part of the supplied TypeScript Program`);
  }
  const checker = options.program.getTypeChecker();
  const calls: IteratorClosureCallAnalysis[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && isIteratorClosureFactory(node.expression, checker)) {
      const optionsArgument = node.arguments[3];
      const optionsObject = optionsArgument && ts.isObjectLiteralExpression(optionsArgument)
        ? optionsArgument
        : undefined;
      const closure = resolveFunctionDeclaration(node.arguments[0], checker);
      calls.push({
        call: node,
        closure,
        references: collectGCReferences(closure, checker, options),
        options: optionsObject,
        captures: optionsObject && getProperty(optionsObject, 'captures'),
        canAutoInsert: !!closure
          && node.arguments.length >= 3
          && (!optionsArgument || ts.isArrayLiteralExpression(optionsArgument) || !!optionsObject),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
}

interface BuiltinFunctionFactory {
  readonly name: 'CreateBuiltinFunction' | 'CreateBuiltinFunction.from';
  readonly closureArgument?: number;
  readonly closureField?: string;
  readonly optionsArgument: number;
}

function parseBuiltinFunctionFactory(
  expression: ts.LeftHandSideExpression,
  checker: ts.TypeChecker,
): BuiltinFunctionFactory | undefined {
  let symbol = checker.getSymbolAtLocation(expression);
  const seen = new Set<ts.Symbol>();
  while (symbol && symbol.flags & ts.SymbolFlags.Alias && !seen.has(symbol)) {
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  if (!symbol || !isBuiltinFunctionDeclaration(symbol)) return undefined;
  if (symbol.name === 'CreateBuiltinFunction') {
    return { name: symbol.name, closureArgument: 0, optionsArgument: 4 };
  }
  if (symbol.name === 'from') {
    return { name: 'CreateBuiltinFunction.from', closureArgument: 0, optionsArgument: 1 };
  }
  return undefined;
}

function isBuiltinFunctionDeclaration(symbol: ts.Symbol): boolean {
  return (symbol.declarations ?? []).some((declaration) => {
    const fileName = declaration.getSourceFile().fileName.replaceAll('\\', '/');
    return fileName.endsWith('/src/abstract-ops/function-operations.mts')
      || fileName.endsWith('/declaration/abstract-ops/function-operations.d.mts')
      || fileName.includes('/node_modules/@engine262/engine262/');
  });
}

function isJobConstructor(expression: ts.LeftHandSideExpression, checker: ts.TypeChecker): boolean {
  let symbol = checker.getSymbolAtLocation(expression);
  const seen = new Set<ts.Symbol>();
  while (symbol && symbol.flags & ts.SymbolFlags.Alias && !seen.has(symbol)) {
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  if (!symbol || symbol.name !== 'Job') return false;
  return (symbol.declarations ?? []).some((declaration) => {
    const fileName = declaration.getSourceFile().fileName.replaceAll('\\', '/');
    return fileName.endsWith('/src/execution-context/Job.mts')
      || fileName.endsWith('/declaration/execution-context/Job.d.mts')
      || fileName.includes('/node_modules/@engine262/engine262/');
  });
}

function isIteratorClosureFactory(expression: ts.LeftHandSideExpression, checker: ts.TypeChecker): boolean {
  let symbol = checker.getSymbolAtLocation(expression);
  const seen = new Set<ts.Symbol>();
  while (symbol && symbol.flags & ts.SymbolFlags.Alias && !seen.has(symbol)) {
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  if (!symbol || symbol.name !== 'CreateIteratorFromClosure') return false;
  return (symbol.declarations ?? []).some((declaration) => {
    const fileName = declaration.getSourceFile().fileName.replaceAll('\\', '/');
    return fileName.endsWith('/src/abstract-ops/generator-operations.mts')
      || fileName.endsWith('/declaration/abstract-ops/generator-operations.d.mts')
      || fileName.includes('/node_modules/@engine262/engine262/');
  });
}

function resolveClosure(
  call: ts.CallExpression,
  factory: BuiltinFunctionFactory,
  options: ts.ObjectLiteralExpression | undefined,
  checker: ts.TypeChecker,
): ts.FunctionLikeDeclaration | undefined {
  const closure = factory.closureArgument === undefined
    ? (() => {
      const property = options && factory.closureField
        ? getProperty(options, factory.closureField)
        : undefined;
      return property
        ? propertyValue(property)
        : undefined;
    })()
    : call.arguments[factory.closureArgument];
  return resolveFunctionDeclaration(closure, checker);
}

function propertyValue(property: ts.ObjectLiteralElementLike): ts.Node | undefined {
  if (ts.isPropertyAssignment(property)) return property.initializer;
  if (ts.isShorthandPropertyAssignment(property)) return property.name;
  if (ts.isMethodDeclaration(property)) return property;
  return undefined;
}

function resolveFunctionDeclaration(
  expression: ts.Node | undefined,
  checker: ts.TypeChecker,
): ts.FunctionLikeDeclaration | undefined {
  if (!expression) return undefined;
  if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression) || ts.isMethodDeclaration(expression)) {
    return expression;
  }
  if (!ts.isIdentifier(expression)) return undefined;
  const symbol = (ts.isShorthandPropertyAssignment(expression.parent)
    ? checker.getShorthandAssignmentValueSymbol(expression.parent)
    : undefined) ?? checker.getSymbolAtLocation(expression);
  for (const declaration of symbol?.declarations ?? []) {
    if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) return declaration;
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      const initializer = declaration.initializer;
      if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return initializer;
    }
  }
  return undefined;
}

function canAutoInsert(
  call: ts.CallExpression,
  factory: BuiltinFunctionFactory,
  options: ts.ObjectLiteralExpression | undefined,
  closure: ts.FunctionLikeDeclaration,
): boolean {
  if (options) return true;
  if (factory.name === 'CreateBuiltinFunction.from') {
    return !!closure && call.arguments.length <= factory.optionsArgument;
  }
  return call.arguments.length >= factory.optionsArgument;
}

function getProperty(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.ObjectLiteralElementLike | undefined {
  return object.properties.find((property) => propertyName(property.name) === name);
}

function propertyName(name: ts.PropertyName | undefined): string | undefined {
  if (name && (ts.isIdentifier(name) || ts.isStringLiteral(name))) return name.text;
  return undefined;
}

function collectGCReferences(
  fn: ts.FunctionLikeDeclaration | undefined,
  checker: ts.TypeChecker,
  options: GCTypeOptions,
): readonly BuiltinFunctionCaptureReference[] {
  if (!fn?.body) return [];

  const references: BuiltinFunctionCaptureReference[] = [];
  const addReference = (symbol: ts.Symbol, expression: ts.Expression, capturePath: readonly string[]) => {
    if (references.some((reference) => (
      reference.symbol === symbol
      && reference.path.length === capturePath.length
      && reference.path.every((part, index) => part === capturePath[index])
    ))) return;
    references.push({
      symbol,
      expression,
      path: capturePath,
      displayName: capturePath.length === 0 ? symbol.name : expression.getText(),
    });
  };
  const isCaptured = (symbol: ts.Symbol | undefined, node: ts.Identifier): symbol is ts.Symbol => {
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    return !!(
      symbol
      && declaration
      && !containsNode(fn, declaration)
      && declaration.getSourceFile() === fn.getSourceFile()
      && !ts.isImportSpecifier(declaration)
      && !ts.isImportClause(declaration)
      && node.text !== 'surroundingAgent'
    );
  };
  const visit = (node: ts.Node) => {
    if (isCaptureAccess(node) && isGCRelevant(checker.getTypeAtLocation(node), checker, options)) {
      const capturePath = captureToAccessPath(node, checker);
      if (capturePath && isCaptured(capturePath.symbol, capturePath.root)) {
        const rootType = checker.getTypeAtLocation(capturePath.root);
        const receiverType = isCaptureAccess(node.expression)
          ? checker.getTypeAtLocation(node.expression)
          : undefined;
        if (!isGCRelevant(rootType, checker, options) && (!receiverType || !isGCRelevant(receiverType, checker, options))) {
          addReference(capturePath.symbol, node, capturePath.parts);
        }
      }
    }
    if (ts.isIdentifier(node) && isIdentifierReference(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      if (isCaptured(symbol, node) && isGCRelevant(checker.getTypeAtLocation(node), checker, options)) {
        addReference(symbol, node, []);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(fn.body);
  return references;
}

function containsNode(ancestor: ts.Node, node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function isCaptureAccess(node: ts.Node): node is ts.PropertyAccessExpression | ts.ElementAccessExpression {
  return ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node);
}

function captureToAccessPath(
  expression: ts.PropertyAccessExpression | ts.ElementAccessExpression,
  checker: ts.TypeChecker,
): { readonly root: ts.Identifier; readonly symbol: ts.Symbol; readonly parts: readonly string[] } | undefined {
  const parts: string[] = [];
  let current: ts.Expression = expression;
  while (isCaptureAccess(current)) {
    if (ts.isPropertyAccessExpression(current)) {
      parts.unshift(current.name.text);
    } else {
      const argument = current.argumentExpression;
      if (!argument) return undefined;
      parts.unshift(`[${argument.getText()}]`);
    }
    current = current.expression;
  }
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  if (!ts.isIdentifier(current)) return undefined;
  const symbol = checker.getSymbolAtLocation(current);
  return symbol ? { root: current, symbol, parts } : undefined;
}

function findSourceFile(program: ts.Program, fileName: string): ts.SourceFile | undefined {
  const normalized = path.resolve(fileName).replaceAll('\\', '/');
  return program.getSourceFiles().find((sourceFile) => (
    path.resolve(sourceFile.fileName).replaceAll('\\', '/') === normalized
  ));
}
