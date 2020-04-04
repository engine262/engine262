import { X } from '../completion.mjs';
import { Value } from '../value.mjs';
import {
  Assert,
  isLeadingSurrogate,
  isTrailingSurrogate,
} from './all.mjs';

// This file covers abstract operations defined in
// 10 #sec-ecmascript-language-source-code

// 10.1.1 #sec-utf16encoding
export function UTF16Encoding(cp) {
  Assert(cp >= 0 && cp <= 0x10FFFF);
  if (cp <= 0xFFFF) {
    return [cp];
  }
  const cu1 = Math.floor((cp - 0x10000) / 0x400) + 0xD800;
  const cu2 = ((cp - 0x10000) % 0x400) + 0xDC00;
  return [cu1, cu2];
}

// 10.1.2 #sec-utf16encode
export function UTF16Encode(text) {
  return new Value(text.map(UTF16Encoding).join(''));
}

// 10.1.3 #sec-utf16decodesurrogatepair
export function UTF16DecodeSurrogatePair(lead, trail) {
  Assert(isLeadingSurrogate(lead) && isTrailingSurrogate(trail));
  const cp = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
  return cp;
}

// 10.1.4 #sec-codepointat
export function CodePointAt(string, position) {
  const size = string.stringValue().length;
  Assert(position >= 0 && position < size);
  const first = string.stringValue().charCodeAt(position);
  let cp = first;
  if (!isLeadingSurrogate(first) && !isTrailingSurrogate(first)) {
    return {
      CodePoint: new Value(cp),
      CodeUnitCount: new Value(1),
      IsUnpairedSurrogate: Value.false,
    };
  }
  if (isTrailingSurrogate(first) || position + 1 === size) {
    return {
      CodePoint: new Value(cp),
      CodeUnitCount: new Value(1),
      IsUnpairedSurrogate: Value.true,
    };
  }
  const second = string.stringValue().charCodeAt(position + 1);
  if (!isTrailingSurrogate(second)) {
    return {
      CodePoint: new Value(cp),
      CodeUnitCount: new Value(1),
      IsUnpairedSurrogate: Value.true,
    };
  }
  cp = X(UTF16DecodeSurrogatePair(first, second));
  return {
    CodePoint: new Value(cp),
    CodeUnitCount: new Value(2),
    IsUnpairedSurrogate: Value.false,
  };
}

// 10.1.5 #sec-utf16decodestring
export function UTF16DecodeString(string) {
  const codePoints = [];
  const size = string.stringValue().length;
  let position = 0;
  while (position < size) {
    const cp = X(CodePointAt(string, position));
    codePoints.push(cp.CodePoint);
    position += cp.CodeUnitCount;
  }
  return codePoints;
}
