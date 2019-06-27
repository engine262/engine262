import {
  Assert,
  isLeadingSurrogate,
  isTrailingSurrogate,
} from '../abstract-ops/all.mjs';

// 10.1.2 #sec-utf16decode
export function UTF16Decode(lead, trail) {
  Assert(isLeadingSurrogate(lead) && isTrailingSurrogate(trail));
  const cp = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
  return cp;
}
