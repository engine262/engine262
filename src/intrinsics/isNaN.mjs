import {
  ToNumber,
  CreateBuiltinFunction,
  SetFunctionName,
  SetFunctionLength,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';

// #sec-isnan-number
function IsNaN([number = Value.undefined]) {
  // 1. Let num be ? ToNumber(number).
  const num = Q(ToNumber(number));
  // 2. If num is NaN, return true.
  if (num.isNaN()) {
    return Value.true;
  }
  // 3. Otherwise, return false.
  return Value.false;
}

export function BootstrapIsNaN(realmRec) {
  const fn = CreateBuiltinFunction(IsNaN, [], realmRec);
  X(SetFunctionName(fn, new Value('isNaN')));
  X(SetFunctionLength(fn, new Value(1)));
  realmRec.Intrinsics['%isNaN%'] = fn;
}
