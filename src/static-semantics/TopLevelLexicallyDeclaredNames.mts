import { isArray } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { JSStringValue } from '../value.mts';
import { BoundNames } from './all.mts';

export function TopLevelLexicallyDeclaredNames(node: ParseNode | readonly ParseNode[]): JSStringValue[] {
  if (isArray(node)) {
    const names = [];
    for (const StatementListItem of node) {
      names.push(...TopLevelLexicallyDeclaredNames(StatementListItem));
    }
    return names;
  }
  switch (node.type) {
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
      return BoundNames(node);
    default:
      return [];
  }
}
