import { Assert } from '../abstract-ops/all.mjs';

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
