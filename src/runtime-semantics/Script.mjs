import { Value } from '../value.mjs';
import { NormalCompletion } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';

// #sec-script-semantics-runtime-semantics-evaluation
// Script :
//   [empty]
//   ScriptBody
export function* Evaluate_Script({ ScriptBody }) {
  if (!ScriptBody) {
    return NormalCompletion(Value.undefined);
  }
  return yield* Evaluate(ScriptBody);
}
