import { New as NewValue } from '../value.mjs';
import {
  ToNumber,
  CreateBuiltinFunction,
  SetFunctionName,
  SetFunctionLength,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

function isNaN([number]) {
  const num = Q(ToNumber(number));
  if (num.isNaN()) {
    return NewValue(true);
  }
  return NewValue(false);
}

export function CreateFunctionProperties(realmRec) {
  [
    ['isNaN', isNaN, 1],
  ].forEach(([name, fn, len]) => {
    fn = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(fn, NewValue(name));
    SetFunctionLength(fn, NewValue(len));
    realmRec.Intrinsics[`%${name}%`] = fn;
  });
}
