import {
  TopLevelVarDeclaredNames_StatementList,
} from './TopLevelVarDeclaredNames.mjs';

// 15.1.5 #sec-scripts-static-semantics-vardeclarednames
//   ScriptBody : StatementList
export function VarDeclaredNames_ScriptBody(ScriptBody) {
  return TopLevelVarDeclaredNames_StatementList(ScriptBody);
}

// (implicit)
//   StatementListItem : Statement
//   StatementListItem : Declaration
export function VarDeclaredNames_StatementListItem(StatementListItem) {
  return [];
}
