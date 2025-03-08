import {
  ToNumber,
  CreateBuiltinFunction,
  Realm,
} from '../abstract-ops/all.mts';
import { Value, type Arguments } from '../value.mts';
import { Q, type ExpressionCompletion } from '../completion.mts';

/** https://tc39.es/ecma262/#sec-isnan-number */
function IsNaN([number = Value.undefined]: Arguments): ExpressionCompletion {
  // 1. Let num be ? ToNumber(number).
  const num = Q(ToNumber(number));
  // 2. If num is NaN, return true.
  if (num.isNaN()) {
    return Value.true;
  }
  // 3. Otherwise, return false.
  return Value.false;
}

export function bootstrapIsNaN(realmRec: Realm) {
  realmRec.Intrinsics['%isNaN%'] = CreateBuiltinFunction(IsNaN, 1, Value('isNaN'), [], realmRec);
}
