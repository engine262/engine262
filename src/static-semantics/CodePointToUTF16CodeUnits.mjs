import { Assert } from '../abstract-ops/all.mjs';

/** http://tc39.es/ecma262/#sec-codepointtoutf16codeunits  */
export function CodePointToUTF16CodeUnits(cp) {
  // 1. Assert: 0 ≤ cp ≤ 0x10FFFF.
  Assert(cp >= 0 && cp <= 0x10FFFF);
  // 2. If cp ≤ 0xFFFF, return cp.
  if (cp <= 0xFFFF) {
    return [cp];
  }
  // 3. Let cu1 be floor((cp - 0x10000) / 0x400) + 0xD800.
  const cu1 = Math.floor((cp - 0x10000) / 0x400) + 0xD800;
  // 4. Let cu2 be ((cp - 0x10000) modulo 0x400) + 0xDC00.
  const cu2 = ((cp - 0x10000) % 0x400) + 0xDC00;
  // 5. Return the code unit sequence consisting of cu1 followed by cu2.
  return [cu1, cu2];
}
