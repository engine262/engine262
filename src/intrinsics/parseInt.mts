import {
  Assert,
  CreateBuiltinFunction,
  ToInt32,
  ToString,
  F, R as MathematicalValue,
  Realm,
} from '../abstract-ops/all.mts';
import { TrimString } from '../runtime-semantics/all.mts';
import { Q, X, type ExpressionCompletion } from '../completion.mts';
import { Value, type Arguments } from '../value.mts';

function digitToNumber(_digit: string) {
  let digit = _digit.charCodeAt(0);
  if (digit < 0x30 /* 0 */) {
    return NaN;
  }
  if (digit <= 0x39 /* 9 */) {
    return digit - 0x30;
  }
  // Convert to lower case.
  digit &= ~0x20; // eslint-disable-line no-bitwise
  if (digit < 0x41 /* A */) {
    return NaN;
  }
  if (digit <= 0x5a /* Z */) {
    return digit - 0x41 /* A */ + 10;
  }
  return NaN;
}

function stringToRadixNumber(str: string, R: number) {
  let num = 0;
  for (let i = 0; i < str.length; i += 1) {
    const power = str.length - i - 1;
    const multiplier = R ** power;
    const dig = digitToNumber(str[i]);
    Assert(!Number.isNaN(dig) && dig < R);
    num += dig * multiplier;
  }
  return num;
}

function searchNotRadixDigit(str: string, R: number) {
  for (let i = 0; i < str.length; i += 1) {
    const num = digitToNumber(str[i]);
    if (Number.isNaN(num) || num >= R) {
      return i;
    }
  }
  return str.length;
}

/** https://tc39.es/ecma262/#sec-parseint-string-radix */
function ParseInt([string = Value.undefined, radix = Value.undefined]: Arguments): ExpressionCompletion {
  const inputString = Q(ToString(string));
  let S = X(TrimString(inputString, 'start')).stringValue();
  let sign = 1;
  if (S !== '' && S[0] === '\x2D') {
    sign = -1;
  }
  if (S !== '' && (S[0] === '\x2B' || S[0] === '\x2D')) {
    S = S.slice(1);
  }

  let R = MathematicalValue(Q(ToInt32(radix)));
  let stripPrefix = true;
  if (R !== 0) {
    if (R < 2 || R > 36) {
      return F(NaN);
    }
    if (R !== 16) {
      stripPrefix = false;
    }
  } else {
    R = 10;
  }
  if (stripPrefix === true) {
    if (S.length >= 2 && (S.startsWith('0x') || S.startsWith('0X'))) {
      S = S.slice(2);
      R = 16;
    }
  }
  const Z = S.slice(0, searchNotRadixDigit(S, R));
  if (Z === '') {
    return F(NaN);
  }
  const mathInt = stringToRadixNumber(Z, R);
  if (mathInt === 0) {
    if (sign === -1) {
      return F(-0);
    }
    return F(+0);
  }
  const number = mathInt;
  return F(sign * number);
}

export function bootstrapParseInt(realmRec: Realm) {
  realmRec.Intrinsics['%parseInt%'] = CreateBuiltinFunction(ParseInt, 2, Value('parseInt'), [], realmRec);
}
