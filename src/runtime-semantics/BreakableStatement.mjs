import { ValueSet } from '../helpers.mjs';
import { LabelledEvaluation_BreakableStatement } from './all.mjs';

// #sec-statement-semantics-runtime-semantics-evaluation
//   BreakableStatement :
//     IterationStatement
//     SwitchStatement
//
//   IterationStatement :
//     (DoStatement)
//     (WhileStatement)
export function Evaluate_BreakableStatement(BreakableStatement) {
  // 1. Let newLabelSet be a new empty List.
  const newLabelSet = new ValueSet();
  // 2. Return the result of performing LabelledEvaluation of this BreakableStatement with argument newLabelSet.
  return LabelledEvaluation_BreakableStatement(BreakableStatement, newLabelSet);
}
