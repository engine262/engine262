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
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
    case 'FunctionDeclaration':
    case 'GeneratorDeclaration':
    case 'AsyncFunctionDeclaration':
    case 'AsyncGeneratorDeclaration':
      return [DeclarationPart(node)];
    default:
      return [];
  }
}
