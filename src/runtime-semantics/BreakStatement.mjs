import { BreakCompletion } from '../completion.mjs';
import { StringValue } from '../static-semantics/all.mjs';

// #sec-break-statement-runtime-semantics-evaluation
//   BreakStatement :
//     `break` `;`
//     `break` LabelIdentifier `;`
export function Evaluate_BreakStatement({ LabelIdentifier }) {
  if (LabelIdentifier === null) {
    // 1. Return Completion { [[Type]]: break, [[Value]]: empty, [[Target]]: empty }.
    return new BreakCompletion(undefined);
  }
  // 1. Let label be the StringValue of LabelIdentifier.
  const label = StringValue(LabelIdentifier);
  // 2. Return Completion { [[Type]]: break, [[Value]]: empty, [[Target]]: label }.
  return new BreakCompletion(label);
}
