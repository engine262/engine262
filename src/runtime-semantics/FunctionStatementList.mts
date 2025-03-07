// @ts-nocheck
import type { ParseNode } from '../parser/ParseNode.mts';
import { Evaluate_StatementList } from './all.mts';

/** https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluation */
//   FunctionStatementList : [empty]
//
// (implicit)
//   FunctionStatementList : StatementList
export function Evaluate_FunctionStatementList(FunctionStatementList: ParseNode.FunctionStatementList) {
  return Evaluate_StatementList(FunctionStatementList);
}
