import { Type, Value } from '../value.mjs';
import { CanonicalNumericIndexString } from './all.mjs';
import { X } from '../completion.mjs';

// This file covers predicates defined in
// 6 #sec-ecmascript-data-types-and-values

// 6.1.4 #leading-surrogate
export function isLeadingSurrogate(cp) {
  return cp >= 0xD800 && cp <= 0xDBFF;
}

// 6.1.4 #trailing-surrogate
export function isTrailingSurrogate(cp) {
  return cp >= 0xDC00 && cp <= 0xDFFF;
}

// 6.1.7 #integer-index
export function isIntegerIndex(V) {
  if (Type(V) !== 'String') {
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
  if (Type(V) !== 'String') {
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
