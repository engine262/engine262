import {
  TopLevelLexicallyScopedDeclarationsStatementList,
} from './TopLevelLexicallyScopedDeclarations.mjs';

// #sec-scripts-static-semantics-lexicallyscopeddeclarations
//   ScriptBody : StatementList
export function LexicallyScopedDeclarationsScriptBody(ScriptBody) {
  return TopLevelLexicallyScopedDeclarationsStatementList(ScriptBody);
}
