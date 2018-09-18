import { BreakCompletion } from '../completion.mjs';

// #sec-break-statement-runtime-semantics-evaluation
// BreakStatement :
//   `break` `;`
//   `break` LabelIdentifier `;`
export function Evaluate_BreakStatement(BreakStatement) {
  return new BreakCompletion(BreakStatement.label);
}
