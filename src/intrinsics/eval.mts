import { Q, type ValueEvaluator } from '../completion.mts';
import { Value, type Arguments } from '../value.mts';
import {
  CreateBuiltinFunction,
  PerformEval,
  Realm,
} from '../abstract-ops/all.mts';

/** https://tc39.es/ecma262/#sec-eval-x */
function* Eval([x = Value.undefined]: Arguments): ValueEvaluator {
  return Q(yield* PerformEval(x, false, false));
}

export function bootstrapEval(realmRec: Realm) {
  realmRec.Intrinsics['%eval%'] = CreateBuiltinFunction(Eval, 1, Value('eval'), [], realmRec);
}
