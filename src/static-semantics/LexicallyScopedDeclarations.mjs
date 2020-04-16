import { TopLevelLexicallyScopedDeclarations, DeclarationPart } from './all.mjs';

export function LexicallyScopedDeclarations(node) {
  if (Array.isArray(node)) {
    const declarations = [];
    for (const item of node) {
      declarations.push(...LexicallyScopedDeclarations(item));
    }
    return declarations;
  }
  switch (node.type) {
    case 'LabelledStatement':
      return LexicallyScopedDeclarations(node.LabelledItem);
    case 'Script':
      if (node.ScriptBody === null) {
        return [];
      }
      return LexicallyScopedDeclarations(node.ScriptBody);
    case 'ScriptBody':
      return TopLevelLexicallyScopedDeclarations(node.StatementList);
    case 'FunctionBody':
    case 'GeneratorBody':
    case 'AsyncFunctionBody':
    case 'AsyncGeneratorBody':
      return TopLevelLexicallyScopedDeclarations(node.FunctionStatementList);
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
    case 'FunctionDeclaration':
    case 'GeneratorDeclaration':
    case 'AsyncFunctionDeclaration':
    case 'AsyncGeneratorDeclaration':
      return [DeclarationPart(node)];
    case 'CaseBlock': {
      const names = [];
      if (node.CaseClauses_a !== null) {
        names.push(...LexicallyScopedDeclarations(node.CaseClauses_a));
      }
      if (node.DefaultClause !== null) {
        names.push(...LexicallyScopedDeclarations(node.DefaultClause));
      }
      if (node.CaseClauses_b !== null) {
        names.push(...LexicallyScopedDeclarations(node.CaseClauses_b));
      }
      return names;
    }
    case 'CaseClause':
    case 'DefaultClause':
      if (node.StatementList !== null) {
        return LexicallyScopedDeclarations(node.StatementList);
      }
      return [];
    default:
      return [];
  }
}
