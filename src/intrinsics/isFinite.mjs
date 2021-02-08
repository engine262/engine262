import {
  ToNumber,
  CreateBuiltinFunction,
  SetFunctionName,
  SetFunctionLength,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';

// #sec-isfinite-number
function IsFinite([number = Value.undefined]) {
  // 1. Let num be ? ToNumber(number).
  const num = Q(ToNumber(number));
  // 2. If num is NaN, +∞, or -∞, return false.
  if (num.isNaN() || num.isInfinity()) {
    return Value.false;
  }
  // 3. Otherwise, return true.
  return Value.true;
}

export function bootstrapIsFinite(realmRec) {
  const fn = CreateBuiltinFunction(IsFinite, [], realmRec);
  X(SetFunctionName(fn, new Value('isFinite')));
  X(SetFunctionLength(fn, 1));
  realmRec.Intrinsics['%isFinite%'] = fn;
}
