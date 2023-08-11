import { Value } from '../value.mjs';
import { NormalCompletion } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';

/** https://tc39.es/ecma262/#sec-script-semantics-runtime-semantics-evaluation */
// Script :
//   [empty]
//   ScriptBody
export function* Evaluate_Script({ ScriptBody }: ParseNode.Script) {
  if (!ScriptBody) {
    return NormalCompletion(Value.undefined);
  }
  return yield* Evaluate(ScriptBody);
}
