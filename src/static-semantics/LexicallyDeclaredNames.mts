// @ts-nocheck
import {
  TopLevelLexicallyDeclaredNames,
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
    case 'AsyncBody':
    case 'AsyncGeneratorBody':
      return TopLevelLexicallyDeclaredNames(node.FunctionStatementList);
    case 'ClassStaticBlockBody':
      return TopLevelLexicallyDeclaredNames(node.ClassStaticBlockStatementList);
    default:
      return [];
  }
}
