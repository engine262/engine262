import { JSStringValue, Value } from '../value.mjs';
import { X } from '../completion.mjs';
import { CanonicalNumericIndexString } from './all.mjs';

// This file covers predicates defined in
/** http://tc39.es/ecma262/#sec-ecmascript-data-types-and-values  */

// 6.1.7 #integer-index
export function isIntegerIndex(V) {
  if (!(V instanceof JSStringValue)) {
    return false;
  }
  const numeric = X(CanonicalNumericIndexString(V));
  if (numeric === Value.undefined) {
    return false;
  }
  if (Object.is(numeric.numberValue(), +0)) {
    return true;
  }
  return numeric.numberValue() > 0 && Number.isSafeInteger(numeric.numberValue());
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
  if (!Number.isInteger(numeric.numberValue())) {
    return false;
  }
  if (Object.is(numeric.numberValue(), +0)) {
    return true;
  }
  return numeric.numberValue() > 0 && numeric.numberValue() < (2 ** 32) - 1;
}

export function isNonNegativeInteger(argument) {
  return Number.isInteger(argument) && argument >= 0;
}
