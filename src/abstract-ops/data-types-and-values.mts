import { JSStringValue, UndefinedValue, Value } from '../value.mts';
import { X } from '../completion.mts';
import { CanonicalNumericIndexString, R } from './all.mts';

// This file covers predicates defined in
/** https://tc39.es/ecma262/#sec-ecmascript-data-types-and-values */

// 6.1.7 #integer-index
export function isIntegerIndex(V: Value) {
  if (!(V instanceof JSStringValue)) {
    return false;
  }
  const numeric = X(CanonicalNumericIndexString(V));
  if (numeric instanceof UndefinedValue) {
    return false;
  }
  if (Object.is(R(numeric), +0)) {
    return true;
  }
  return R(numeric) > 0 && Number.isSafeInteger(R(numeric));
}

// 6.1.7 #array-index
export function isArrayIndex(V: Value) {
  if (!(V instanceof JSStringValue)) {
    return false;
  }
  const numeric = X(CanonicalNumericIndexString(V));
  if (numeric instanceof UndefinedValue) {
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

export function isNonNegativeInteger(argument: number) {
  return Number.isInteger(argument) && argument >= 0;
}
