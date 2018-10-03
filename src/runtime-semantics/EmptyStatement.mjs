import { NormalCompletion } from '../completion.mjs';

// #sec-empty-statement-runtime-semantics-evaluation
//   EmptyStatement : `;`
export function Evaluate_EmptyStatement(/* EmptyStatement */) {
  return new NormalCompletion(undefined);
}
