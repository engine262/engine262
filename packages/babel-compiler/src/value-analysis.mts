import path from 'node:path';
import ts from 'typescript';
import { isEngine262ValueSymbol, type GCTypeOptions } from './gc-types.mjs';

export type ValueLiteralConstructor = 'BigIntValue' | 'JSStringValue' | 'NumberValue';

export interface ValueLiteralCreationPlan {
  readonly start: number;
  readonly end: number;
  readonly constructor: ValueLiteralConstructor;
  readonly localConstructor: boolean;
}

export function analyzeValueLiteralCreations(
  fileName: string,
  program: ts.Program,
  options: GCTypeOptions = {},
): readonly ValueLiteralCreationPlan[] {
  const sourceFile = findSourceFile(program, fileName);
  if (!sourceFile) {
    throw new Error(`@engine262/babel-compiler: ${fileName} is not part of the supplied TypeScript Program`);
  }
  const checker = program.getTypeChecker();
  const plans: ValueLiteralCreationPlan[] = [];
  const visit = (node: ts.Node) => {
    // Matches `Value('literal')` and other one-argument value constructors.
    // Matches `Value('literal')` with one non-spread argument.
    if (ts.isCallExpression(node) && node.arguments.length === 1 && !ts.isSpreadElement(node.arguments[0])) {
      const symbol = resolvedSymbol(node.expression, checker);
      if (symbol && isEngine262ValueSymbol(symbol, options)) {
        const constructor = valueConstructor(checker.getTypeAtLocation(node.arguments[0]), checker);
        if (constructor) {
          plans.push({
            start: node.getStart(sourceFile),
            end: node.getEnd(),
            constructor,
            localConstructor: symbol.declarations?.some((declaration) => declaration.getSourceFile() === sourceFile) === true,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return plans;
}

function resolvedSymbol(expression: ts.Expression, checker: ts.TypeChecker): ts.Symbol | undefined {
  let symbol = checker.getSymbolAtLocation(expression);
  const seen = new Set<ts.Symbol>();
  while (symbol?.flags && symbol.flags & ts.SymbolFlags.Alias && !seen.has(symbol)) {
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol;
}

function valueConstructor(
  type: ts.Type,
  checker: ts.TypeChecker,
  seen = new Set<ts.Type>(),
): ValueLiteralConstructor | undefined {
  if (seen.has(type)) return undefined;
  seen.add(type);
  if (type.flags & ts.TypeFlags.StringLike) return 'JSStringValue';
  if (type.flags & ts.TypeFlags.NumberLike) return 'NumberValue';
  if (type.flags & ts.TypeFlags.BigIntLike) return 'BigIntValue';
  if (type.isUnionOrIntersection()) {
    const constructors = new Set(type.types.map((part) => valueConstructor(part, checker, seen)));
    return constructors.size === 1 ? constructors.values().next().value : undefined;
  }
  const constraint = checker.getBaseConstraintOfType(type);
  return constraint && constraint !== type ? valueConstructor(constraint, checker, seen) : undefined;
}

function findSourceFile(program: ts.Program, fileName: string): ts.SourceFile | undefined {
  const normalized = normalize(fileName);
  return program.getSourceFiles().find((sourceFile) => normalize(sourceFile.fileName) === normalized);
}

function normalize(fileName: string): string {
  return path.resolve(fileName).replaceAll('\\', '/');
}
