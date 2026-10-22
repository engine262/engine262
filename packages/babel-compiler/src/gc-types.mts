import path from 'node:path';
import ts from 'typescript';

export interface GCTypeOptions {
  /** Absolute path to the source file that defines engine262's Value type. */
  readonly valueDefinitionPath?: string;
}

export function isGCRelevant(
  type: ts.Type,
  checker: ts.TypeChecker,
  options: GCTypeOptions = {},
  seen = new Set<ts.Type>(),
): boolean {
  if (seen.has(type)) return false;
  seen.add(type);

  const symbol = type.aliasSymbol ?? type.getSymbol();
  const name = symbol?.name;
  if (name === 'Value' && symbol && isEngine262ValueSymbol(symbol, options)) return true;
  if (name && (
    name === 'GCMarkable'
    || name === 'Job'
    || name === 'Generator'
    || name === 'AsyncGenerator'
    || name.endsWith('Evaluator')
  )) return true;
  if (type.getProperty('mark')) return true;
  if (type.isUnionOrIntersection() && type.types.some((part) => isGCRelevant(part, checker, options, seen))) return true;

  const constraint = checker.getBaseConstraintOfType(type);
  if (constraint && constraint !== type && isGCRelevant(constraint, checker, options, seen)) return true;
  if (type.flags & ts.TypeFlags.Object) {
    if ((type as ts.TypeReference).typeArguments?.some((argument) => isGCRelevant(argument, checker, options, seen))) return true;
    if (getBaseTypes(type, checker).some((base) => isGCRelevant(base, checker, options, seen))) return true;
  }
  return false;
}

export function isEngine262ValueSymbol(symbol: ts.Symbol, options: GCTypeOptions): boolean {
  if (symbol.name !== 'Value') return false;
  const expected = options.valueDefinitionPath && normalize(options.valueDefinitionPath);
  return (symbol.declarations ?? []).some((declaration) => {
    const definition = normalize(declaration.getSourceFile().fileName);
    return expected ? definition === expected : definition.toLowerCase().includes('engine262');
  });
}

function getBaseTypes(type: ts.Type, checker: ts.TypeChecker): readonly ts.BaseType[] {
  if (
    type.flags & ts.TypeFlags.Object
    && (type as ts.ObjectType).objectFlags & ts.ObjectFlags.ClassOrInterface
  ) return checker.getBaseTypes(type as ts.InterfaceType);
  return [];
}

function normalize(fileName: string): string {
  return path.resolve(fileName).replaceAll('\\', '/');
}
