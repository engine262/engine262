import {
  CreateBuiltinFunction,
  SetFunctionName,
  SetFunctionLength,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { Value } from '../value.mjs';
import {
  MV_StrDecimalLiteral,
  TrimString,
} from '../runtime-semantics/all.mjs';

// #sec-parsefloat-string
function ParseFloat([string = Value.undefined]) {
  // 1. Let inputString be ? ToString(string).
  const inputString = Q(ToString(string));
  // 2. Let trimmedString be ! TrimString(inputString, start).
  const trimmedString = X(TrimString(inputString, 'start')).stringValue();
  // 3. If neither trimmedString nor any prefix of trimmedString satisfies the syntax of a StrDecimalLiteral (see 7.1.4.1), return NaN.
  // 4. Let numberString be the longest prefix of trimmedString, which might be trimmedString itself, that satisfies the syntax of a StrDecimalLiteral.
  // 5. Let mathFloat be MV of numberString.
  // 6. If mathFloat = 0ℝ, then
  //   a. If the first code unit of trimmedString is the code unit 0x002D (HYPHEN-MINUS), return -0.
  //   b. Return +0.
  const mathFloat = MV_StrDecimalLiteral(trimmedString);
  // 7. Return the Number value for mathFloat.
  return mathFloat;
}

export function BootstrapParseFloat(realmRec) {
  const fn = CreateBuiltinFunction(ParseFloat, [], realmRec);
  X(SetFunctionName(fn, new Value('parseFloat')));
  X(SetFunctionLength(fn, new Value(1)));
  realmRec.Intrinsics['%parseFloat%'] = fn;
}
