import {
  TopLevelVarDeclaredNamesStatementList,
} from './TopLevelVarDeclaredNames.mjs';

// #sec-scripts-static-semantics-vardeclarednames
//   ScriptBody : StatementList
export function VarDeclaredNamesScriptBody(ScriptBody) {
  return TopLevelVarDeclaredNamesStatementList(ScriptBody);
}

// (implicit)
//   StatementListItem : Statement
//   StatementListItem : Declaration
export function VarDeclaredNamesStatementListItem(StatementListItem) {
  return [];
}
