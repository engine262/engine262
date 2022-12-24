// @ts-nocheck
import { Assert } from '../abstract-ops/all.mjs';

/** https://tc39.es/ecma262/#sec-utf16encodecodepoint */
export function UTF16EncodeCodePoint(cp) {
  // 1. Assert: 0 ≤ cp ≤ 0x10FFFF.
  Assert(cp >= 0 && cp <= 0x10FFFF);
  // 2. If cp ≤ 0xFFFF, return the String value consisting of the code unit whose value is cp.
  if (cp <= 0xFFFF) {
    return String.fromCodePoint(cp);
  }
  // 3. Let cu1 be the code unit whose value is floor((cp - 0x10000) / 0x400) + 0xD800.
  const cu1 = Math.floor((cp - 0x10000) / 0x400) + 0xD800;
  // 4. Let cu2 be the code unit whose value is ((cp - 0x10000) modulo 0x400) + 0xDC00.
  const cu2 = ((cp - 0x10000) % 0x400) + 0xDC00;
  // 5. Return the string-concatenation of cu1 and cu2.
  return String.fromCodePoint(cu1, cu2);
}
