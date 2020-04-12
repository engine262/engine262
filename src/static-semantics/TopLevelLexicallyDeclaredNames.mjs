import { BoundNames } from './all.mjs';

export function TopLevelLexicallyDeclaredNames(node) {
  if (Array.isArray(node)) {
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
