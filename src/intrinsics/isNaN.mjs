import {
  ToNumber,
  CreateBuiltinFunction,
  SetFunctionName,
  SetFunctionLength,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';

function IsNaN([number = Value.undefined]) {
  const num = Q(ToNumber(number));
  if (num.isNaN()) {
    return Value.true;
  }
  return Value.false;
}

export function CreateIsNaN(realmRec) {
  const fn = CreateBuiltinFunction(IsNaN, [], realmRec);
  X(SetFunctionName(fn, new Value('isNaN')));
  X(SetFunctionLength(fn, new Value(1)));
  realmRec.Intrinsics['%isNaN%'] = fn;
}
