import { isArray } from '../helpers.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';
import type { JSStringValue } from '../value.mjs';
import { BoundNames, VarDeclaredNames } from './all.mjs';

export function TopLevelVarDeclaredNames(node: ParseNode | readonly ParseNode[]): JSStringValue[] {
  if (isArray(node)) {
    const names = [];
    for (const item of node) {
      names.push(...TopLevelVarDeclaredNames(item));
    }
    return names;
  }
  switch (node.type) {
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
      return [];
    case 'FunctionDeclaration':
    case 'GeneratorDeclaration':
    case 'AsyncFunctionDeclaration':
    case 'AsyncGeneratorDeclaration':
      return BoundNames(node);
    default:
      return VarDeclaredNames(node);
  }
}
