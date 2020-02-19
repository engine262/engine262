import {
  CreateBuiltinFunction,
  SetFunctionName,
  SetFunctionLength,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { Value } from '../value.mjs';
import {
  // MV_StrDecimalLiteral,
  TrimString,
} from '../runtime-semantics/all.mjs';

function ParseFloat([string = Value.undefined]) {
  const inputString = Q(ToString(string));
  const trimmedString = X(TrimString(inputString, 'start')).stringValue();
  const mathFloat = MV_StrDecimalLiteral(trimmedString, true);
  // MV_StrDecimalLiteral handles -0 automatically.
  return mathFloat;
}

export function BootstrapParseFloat(realmRec) {
  const fn = CreateBuiltinFunction(ParseFloat, [], realmRec);
  X(SetFunctionName(fn, new Value('parseFloat')));
  X(SetFunctionLength(fn, new Value(1)));
  realmRec.Intrinsics['%parseFloat%'] = fn;
}
