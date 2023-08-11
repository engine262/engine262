// @ts-nocheck
import { ValueSet } from '../helpers.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';
import { LabelledEvaluation } from './all.mjs';

/** https://tc39.es/ecma262/#sec-statement-semantics-runtime-semantics-evaluation */
//   BreakableStatement :
//     IterationStatement
//     SwitchStatement
//
//   IterationStatement :
//     (DoStatement)
//     (WhileStatement)
export function Evaluate_BreakableStatement(BreakableStatement: ParseNode.BreakableStatement) {
  // 1. Let newLabelSet be a new empty List.
  const newLabelSet = new ValueSet();
  // 2. Return the result of performing LabelledEvaluation of this BreakableStatement with argument newLabelSet.
  return LabelledEvaluation(BreakableStatement, newLabelSet);
}
