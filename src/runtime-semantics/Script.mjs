import { Value } from '../value.mjs';
import { NormalCompletion } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';

// #sec-script-semantics-runtime-semantics-evaluation
// Script :
//   [empty]
//   ScriptBody
export function* Evaluate_Script(Script) {
  if (Script.ScriptBody === null) {
    return NormalCompletion(Value.undefined);
  }

  return yield* Evaluate(Script.ScriptBody);
}
