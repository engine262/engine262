import { NormalCompletion } from '../completion.mjs';

// #sec-empty-statement-runtime-semantics-evaluation
//   EmptyStatement : `;`
export function Evaluate_EmptyStatement(_EmptyStatement) {
  // 1. Return NormalCompletion(empty).
  return new NormalCompletion(undefined);
}
