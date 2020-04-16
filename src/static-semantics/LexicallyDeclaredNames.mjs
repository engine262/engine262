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
    case 'FunctionBody':
    case 'GeneratorBody':
    case 'AsyncFunctionBody':
    case 'AsyncGeneratorBody':
      return TopLevelLexicallyDeclaredNames(node.FunctionStatementList);
    case 'LabelledStatement':
      return LexicallyDeclaredNames(node.LabelledItem);
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
    case 'FunctionDeclaration':
    case 'GeneratorDeclaration':
    case 'AsyncFunctionDeclaration':
    case 'AsyncGeneratorDeclaration':
      return BoundNames(node);
    case 'CaseBlock': {
      const names = [];
      if (node.CaseClauses_a !== null) {
        names.push(...LexicallyDeclaredNames(node.CaseClauses_a));
      }
      if (node.DefaultClause !== null) {
        names.push(...LexicallyDeclaredNames(node.DefaultClause));
      }
      if (node.CaseClauses_b !== null) {
        names.push(...LexicallyDeclaredNames(node.CaseClauses_b));
      }
      return names;
    }
    case 'CaseClause':
    case 'DefaultClause':
      if (node.StatementList !== null) {
        return LexicallyDeclaredNames(node.StatementList);
      }
      return [];
    default:
      return [];
  }
}
