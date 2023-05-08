// @ts-nocheck
import { Evaluate_StatementList } from './all.mjs';

/** https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluation */
//   FunctionStatementList : [empty]
//
// (implicit)
//   FunctionStatementList : StatementList
export function Evaluate_FunctionStatementList(FunctionStatementList) {
  return Evaluate_StatementList(FunctionStatementList);
}
