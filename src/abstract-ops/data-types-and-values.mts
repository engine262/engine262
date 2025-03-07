// @ts-nocheck
import { JSStringValue, Value } from '../value.mjs';
import { X } from '../completion.mjs';
import { CanonicalNumericIndexString, R } from './all.mjs';

// This file covers predicates defined in
/** https://tc39.es/ecma262/#sec-ecmascript-data-types-and-values */

// 6.1.7 #integer-index
export function isIntegerIndex(V) {
  if (!(V instanceof JSStringValue)) {
    return false;
  }
  const numeric = X(CanonicalNumericIndexString(V));
  if (numeric === Value.undefined) {
    return false;
  }
  if (Object.is(R(numeric), +0)) {
    return true;
  }
  return R(numeric) > 0 && Number.isSafeInteger(R(numeric));
}

// 6.1.7 #array-index
export function isArrayIndex(V) {
  if (!(V instanceof JSStringValue)) {
    return false;
  }
  const numeric = X(CanonicalNumericIndexString(V));
  if (numeric === Value.undefined) {
    return false;
  }
  if (!Number.isInteger(R(numeric))) {
    return false;
  }
  if (Object.is(R(numeric), +0)) {
    return true;
  }
  return R(numeric) > 0 && R(numeric) < (2 ** 32) - 1;
}

export function isNonNegativeInteger(argument) {
  return Number.isInteger(argument) && argument >= 0;
}
