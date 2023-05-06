// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  SymbolValue,
  Value,
} from '../value.mjs';
import {
  Assert,
  Get,
  GetPrototypeFromConstructor,
  IsIntegralNumber,
  StringCreate,
  SymbolDescriptiveString,
  LengthOfArrayLike,
  ToNumber,
  ToObject,
  ToString,
  ToUint16,
  F,
} from '../abstract-ops/all.mjs';
import { UTF16EncodeCodePoint } from '../static-semantics/all.mjs';
import { Q, X } from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** http://tc39.es/ecma262/#sec-string-constructor-string-value */
function StringConstructor([value], { NewTarget }) {
  let s;
  if (value === undefined) {
    s = Value('');
  } else {
    if (NewTarget === Value.undefined && value instanceof SymbolValue) {
      return X(SymbolDescriptiveString(value));
    }
    s = Q(ToString(value));
  }
  if (NewTarget === Value.undefined) {
    return s;
  }
  return X(StringCreate(s, Q(GetPrototypeFromConstructor(NewTarget, '%String.prototype%'))));
}

/** http://tc39.es/ecma262/#sec-string.fromcharcode */
function String_fromCharCode(codeUnits) {
  const length = codeUnits.length;
  const elements = [];
  let nextIndex = 0;
  while (nextIndex < length) {
    const next = codeUnits[nextIndex];
    const nextCU = Q(ToUint16(next));
    elements.push(nextCU);
    nextIndex += 1;
  }
  const result = elements.reduce((previous, current) => previous + String.fromCharCode(current.numberValue()), '');
  return Value(result);
}

/** http://tc39.es/ecma262/#sec-string.fromcodepoint */
function String_fromCodePoint(codePoints) {
  // 1. Let result be the empty String.
  let result = '';
  // 2. For each element next of codePoints, do
  for (const next of codePoints) {
    // a. Let nextCP be ? ToNumber(next).
    const nextCP = Q(ToNumber(next));
    // b. If IsIntegralNumber(nextCP) is false, throw a RangeError exception.
    if (X(IsIntegralNumber(nextCP)) === Value.false) {
      return surroundingAgent.Throw('RangeError', 'StringCodePointInvalid', next);
    }
    // c. If ℝ(nextCP) < 0 or ℝ(nextCP) > 0x10FFFF, throw a RangeError exception.
    if (nextCP.numberValue() < 0 || nextCP.numberValue() > 0x10FFFF) {
      return surroundingAgent.Throw('RangeError', 'StringCodePointInvalid', nextCP);
    }
    // d. Set result to the string-concatenation of result and UTF16EncodeCodePoint(ℝ(nextCP)).
    result += UTF16EncodeCodePoint(nextCP.numberValue());
  }
  // 3. Assert: If codePoints is empty, then result is the empty String.
  Assert(!(codePoints.length === 0) || result.length === 0);
  // 4. Return result.
  return Value(result);
}

/** http://tc39.es/ecma262/#sec-string.raw */
function String_raw([template = Value.undefined, ...substitutions]) {
  const numberOfSubstitutions = substitutions.length;
  const cooked = Q(ToObject(template));
  const raw = Q(ToObject(Q(Get(cooked, Value('raw')))));
  const literalSegments = Q(LengthOfArrayLike(raw));
  if (literalSegments <= 0) {
    return Value('');
  }
  // Not sure why the spec uses a List, but this is really just a String.
  const stringElements = [];
  let nextIndex = 0;
  while (true) {
    const nextKey = X(ToString(F(nextIndex)));
    const nextSeg = Q(ToString(Q(Get(raw, nextKey))));
    stringElements.push(nextSeg.stringValue());
    if (nextIndex + 1 === literalSegments) {
      return Value(stringElements.join(''));
    }
    let next;
    if (nextIndex < numberOfSubstitutions) {
      next = substitutions[nextIndex];
    } else {
      next = Value('');
    }
    const nextSub = Q(ToString(next));
    stringElements.push(nextSub.stringValue());
    nextIndex += 1;
  }
}

export function bootstrapString(realmRec) {
  const stringConstructor = bootstrapConstructor(realmRec, StringConstructor, 'String', 1, realmRec.Intrinsics['%String.prototype%'], [
    ['fromCharCode', String_fromCharCode, 1],
    ['fromCodePoint', String_fromCodePoint, 1],
    ['raw', String_raw, 1],
  ]);

  realmRec.Intrinsics['%String%'] = stringConstructor;
}
