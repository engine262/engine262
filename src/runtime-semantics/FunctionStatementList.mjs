import { Evaluate_StatementList } from './all.mjs';

// #sec-function-definitions-runtime-semantics-evaluation
//   FunctionStatementList : [empty]
//
// (implicit)
//   FunctionStatementList : StatementList
export function Evaluate_FunctionStatementList(FunctionStatementList) {
  return Evaluate_StatementList(FunctionStatementList);
}
