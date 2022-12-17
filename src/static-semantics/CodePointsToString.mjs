import { UTF16EncodeCodePoint } from './all.mjs';

/** http://tc39.es/ecma262/#sec-codepointstostring */
export function CodePointsToString(text) {
  // 1. Let result be the empty String.
  let result = '';
  // 2. For each code point cp in text, do
  for (const cp of text) {
    // a. Set result to the string-concatenation of result and UTF16EncodeCodePoint(cp).
    result += UTF16EncodeCodePoint(cp);
  }
  // 3. Return result.
  return result;
}
