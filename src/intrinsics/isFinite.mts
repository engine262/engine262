import {
  ToNumber,
  CreateBuiltinFunction,
  Realm,
} from '../abstract-ops/all.mts';
import { Value, type Arguments } from '../value.mts';
import { Q, type ExpressionCompletion } from '../completion.mts';

/** https://tc39.es/ecma262/#sec-isfinite-number */
function IsFinite([number = Value.undefined]: Arguments): ExpressionCompletion {
  // 1. Let num be ? ToNumber(number).
  const num = Q(ToNumber(number));
  // 2. If num is NaN, +∞, or -∞, return false.
  if (num.isNaN() || num.isInfinity()) {
    return Value.false;
  }
  // 3. Otherwise, return true.
  return Value.true;
}

export function bootstrapIsFinite(realmRec: Realm) {
  realmRec.Intrinsics['%isFinite%'] = CreateBuiltinFunction(IsFinite, 1, Value('isFinite'), [], realmRec);
}
