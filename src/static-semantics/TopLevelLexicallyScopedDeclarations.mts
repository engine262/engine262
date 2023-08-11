import { isArray } from '../helpers.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';

export function TopLevelLexicallyScopedDeclarations(node: ParseNode | readonly ParseNode[]): LexicallyScopedDeclaration[] {
  if (isArray(node)) {
    const declarations = [];
    for (const item of node) {
      declarations.push(...TopLevelLexicallyScopedDeclarations(item));
    }
    return declarations;
  }
  switch (node.type) {
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
      return [node];
    default:
      return [];
  }
}

export type LexicallyScopedDeclaration =
  | ParseNode.ClassDeclaration
  | ParseNode.LexicalDeclaration;
