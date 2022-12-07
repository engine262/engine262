import { Value } from '../value.mjs';
import { NormalCompletion } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';

/** http://tc39.es/ecma262/#sec-module-semantics-runtime-semantics-evaluation  */
// Module :
//   [empty]
//   ModuleBody
export function* Evaluate_Module({ ModuleBody }) {
  if (!ModuleBody) {
    return NormalCompletion(Value.undefined);
  }
  return yield* Evaluate(ModuleBody);
}
