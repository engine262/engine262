import {
  TopLevelLexicallyDeclaredNames,
  BoundNames,
} from './all.mjs';

export function LexicallyDeclaredNames(node) {
  switch (node.type) {
    case 'Script':
      if (node.ScriptBody) {
        return LexicallyDeclaredNames(node.ScriptBody);
      }
      return [];
    case 'ScriptBody':
      return TopLevelLexicallyDeclaredNames(node.StatementList);
    case 'FunctionBody':
    case 'GeneratorBody':
    case 'AsyncFunctionBody':
    case 'AsyncGeneratorBody':
      return TopLevelLexicallyDeclaredNames(node.FunctionStatementList);
    default:
      return [];
  }
}
