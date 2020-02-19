import {
  TopLevelLexicallyDeclaredNames,
  BoundNames,
} from './all.mjs';

export function LexicallyDeclaredNames(node) {
  if (Array.isArray(node)) {
    const names = [];
    for (const StatementListItem of node) {
      names.push(...LexicallyDeclaredNames(StatementListItem));
    }
    return names;
  }
  switch (node.type) {
    case 'Script':
      if (node.ScriptBody === null) {
        return [];
      }
      return LexicallyDeclaredNames(node.ScriptBody);
    case 'ScriptBody':
      return TopLevelLexicallyDeclaredNames(node.StatementList);
    case 'LabelledStatement':
      return LexicallyDeclaredNames(node.LabelledItem);
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
    case 'FunctionDeclaration':
    case 'GeneratorDeclaration':
    case 'AsyncFunctionDeclaration':
    case 'AsyncGeneratorDeclaration':
      return BoundNames(node);
    default:
      return [];
  }
}
