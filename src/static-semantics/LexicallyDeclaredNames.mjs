import {
  TopLevelLexicallyDeclaredNamesStatementList,
} from './TopLevelLexicallyDeclaredNames.mjs';

// #sec-scripts-static-semantics-lexicallydeclarednames
//   ScriptBody : StatementList
export function LexicallyDeclaredNamesScriptBody(ScriptBody) {
  return TopLevelLexicallyDeclaredNamesStatementList(ScriptBody);
}
