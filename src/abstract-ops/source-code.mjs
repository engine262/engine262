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

// 10.1.2 #sec-utf16decode
export function UTF16Decode(lead, trail) {
  Assert(isLeadingSurrogate(lead) && isTrailingSurrogate(trail));
  const cp = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
  return cp;
}

// 10.1.3 #sec-codepointat
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
  cp = X(UTF16Decode(first, second));
  return {
    CodePoint: new Value(cp),
    CodeUnitCount: new Value(2),
    IsUnpairedSurrogate: Value.false,
  };
}
