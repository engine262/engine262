import {
  TopLevelLexicallyScopedDeclarations_StatementList,
} from './TopLevelLexicallyScopedDeclarations.mjs';

// #sec-scripts-static-semantics-lexicallyscopeddeclarations
//   ScriptBody : StatementList
export function LexicallyScopedDeclarations_ScriptBody(ScriptBody) {
  return TopLevelLexicallyScopedDeclarations_StatementList(ScriptBody);
}
