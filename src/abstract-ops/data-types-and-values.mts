// @ts-nocheck
import { JSStringValue, Value } from '../value.mjs';
import { X } from '../completion.mjs';
import { CanonicalNumericIndexString, ℝ } from './all.mjs';

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
  if (Object.is(ℝ(numeric), +0)) {
    return true;
  }
  return ℝ(numeric) > 0 && Number.isSafeInteger(ℝ(numeric));
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
  if (!Number.isInteger(ℝ(numeric))) {
    return false;
  }
  if (Object.is(ℝ(numeric), +0)) {
    return true;
  }
  return ℝ(numeric) > 0 && ℝ(numeric) < (2 ** 32) - 1;
}

export function isNonNegativeInteger(argument) {
  return Number.isInteger(argument) && argument >= 0;
}
