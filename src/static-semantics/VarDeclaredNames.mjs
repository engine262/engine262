import {
  TopLevelVarDeclaredNames_StatementList,
} from './TopLevelVarDeclaredNames.mjs';

// #sec-scripts-static-semantics-vardeclarednames
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
