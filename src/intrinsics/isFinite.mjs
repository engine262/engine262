import {
  ToNumber,
  CreateBuiltinFunction,
  SetFunctionName,
  SetFunctionLength,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';

function IsFinite([number]) {
  const num = Q(ToNumber(number));
  if (num.isNaN() || num.isInfinity()) {
    return Value.false;
  }
  return Value.true;
}

export function CreateIsFinite(realmRec) {
  const fn = CreateBuiltinFunction(IsFinite, [], realmRec);
  X(SetFunctionName(fn, new Value('isFinite')));
  X(SetFunctionLength(fn, new Value(1)));
  realmRec.Intrinsics['%isFinite%'] = fn;
}
