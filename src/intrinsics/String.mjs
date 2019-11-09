import { surroundingAgent } from '../engine.mjs';
import {
  Get,
  GetPrototypeFromConstructor,
  IsInteger,
  StringCreate,
  SymbolDescriptiveString,
  LengthOfArrayLike,
  ToNumber,
  ToObject,
  ToString,
  ToUint16,
  UTF16Encoding,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// 21.1.1.1 #sec-string-constructor-string-value
function StringConstructor(args, { NewTarget }) {
  let s;
  if (args.length === 0) {
    // String ( )
    s = new Value('');
  } else {
    // String ( value )
    const [value] = args;
    if (NewTarget === Value.undefined && Type(value) === 'Symbol') {
      return X(SymbolDescriptiveString(value));
    }
    s = Q(ToString(value));
  }
  if (NewTarget === Value.undefined) {
    return s;
  }
  return X(StringCreate(s, Q(GetPrototypeFromConstructor(NewTarget, '%String.prototype%'))));
}

// 21.1.2.1 #sec-string.fromcharcode
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
  return new Value(result);
}

// 21.1.2.2 #sec-string.fromcodepoint
function String_fromCodePoint(codePoints) {
  const length = codePoints.length;
  const elements = [];
  let nextIndex = 0;
  while (nextIndex < length) {
    const next = codePoints[nextIndex];
    const nextCP = Q(ToNumber(next));
    if (X(IsInteger(nextCP)) === Value.false) {
      return surroundingAgent.Throw('RangeError', 'StringCodePointInvalid', next);
    }
    if (nextCP.numberValue() < 0 || nextCP.numberValue() > 0x10FFFF) {
      return surroundingAgent.Throw('RangeError', 'StringCodePointInvalid', nextCP);
    }
    elements.push(...UTF16Encoding(nextCP.numberValue()));
    nextIndex += 1;
  }
  const result = elements.reduce((previous, current) => previous + String.fromCharCode(current), '');
  return new Value(result);
}

// 21.1.2.4 #sec-string.raw
function String_raw([template = Value.undefined, ...substitutions]) {
  const numberOfSubstitutions = substitutions.length;
  const cooked = Q(ToObject(template));
  const raw = Q(ToObject(Q(Get(cooked, new Value('raw')))));
  const literalSegments = Q(LengthOfArrayLike(raw)).numberValue();
  if (literalSegments <= 0) {
    return new Value('');
  }
  // Not sure why the spec uses a List, but this is really just a String.
  const stringElements = [];
  let nextIndex = 0;
  while (true) {
    const nextKey = X(ToString(new Value(nextIndex)));
    const nextSeg = Q(ToString(Q(Get(raw, nextKey))));
    stringElements.push(nextSeg.stringValue());
    if (nextIndex + 1 === literalSegments) {
      return new Value(stringElements.join(''));
    }
    let next;
    if (nextIndex < numberOfSubstitutions) {
      next = substitutions[nextIndex];
    } else {
      next = new Value('');
    }
    const nextSub = Q(ToString(next));
    stringElements.push(nextSub.stringValue());
    nextIndex += 1;
  }
}

export function CreateString(realmRec) {
  const stringConstructor = BootstrapConstructor(realmRec, StringConstructor, 'String', 1, realmRec.Intrinsics['%String.prototype%'], [
    ['fromCharCode', String_fromCharCode, 1],
    ['fromCodePoint', String_fromCodePoint, 1],
    ['raw', String_raw, 1],
  ]);

  realmRec.Intrinsics['%String%'] = stringConstructor;
}
