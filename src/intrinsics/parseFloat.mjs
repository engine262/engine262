import {
  CreateBuiltinFunction,
  SetFunctionName,
  SetFunctionLength,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { Value } from '../value.mjs';
import { searchNotStrWhiteSpaceChar } from '../grammar/numeric-string.mjs';
import { MV_StrDecimalLiteral } from '../runtime-semantics/all.mjs';

function ParseFloat([string = Value.undefined]) {
  const inputString = Q(ToString(string)).stringValue();
  const trimmedString = inputString.slice(searchNotStrWhiteSpaceChar(inputString));
  const mathFloat = MV_StrDecimalLiteral(trimmedString, true);
  // MV_StrDecimalLiteral handles -0 automatically.
  return mathFloat;
}

export function CreateParseFloat(realmRec) {
  const fn = CreateBuiltinFunction(ParseFloat, [], realmRec);
  X(SetFunctionName(fn, new Value('parseFloat')));
  X(SetFunctionLength(fn, new Value(1)));
  realmRec.Intrinsics['%parseFloat%'] = fn;
}
