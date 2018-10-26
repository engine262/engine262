import { Assert } from '../abstract-ops/all.mjs';

// #sec-utf16decode
export function UTF16Decode(lead, trail) {
  Assert(lead >= 0xD800 && lead <= 0xDBFF && trail >= 0xDC00 && trail <= 0xDFFF);
  const cp = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
  return cp;
}
