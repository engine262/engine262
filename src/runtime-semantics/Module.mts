import { Value } from '../value.mjs';
import { NormalCompletion } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';

/** https://tc39.es/ecma262/#sec-module-semantics-runtime-semantics-evaluation */
// Module :
//   [empty]
//   ModuleBody
export function* Evaluate_Module({ ModuleBody }: ParseNode.Module) {
  if (!ModuleBody) {
    return NormalCompletion(Value.undefined);
  }
  return yield* Evaluate(ModuleBody);
}
