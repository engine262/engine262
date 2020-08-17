import { Assert } from '../abstract-ops/all.mjs';
import { isLeadingSurrogate, isTrailingSurrogate } from '../parser/Lexer.mjs';

// #sec-utf16decodesurrogatepair
export function UTF16SurrogatePairToCodePoint(lead, trail) {
  // 1. Assert: lead is a leading surrogate and trail is a trailing surrogate.
  Assert(isLeadingSurrogate(lead) && isTrailingSurrogate(trail));
  // 2. Let cp be (lead - 0xD800) × 0x400 + (trail - 0xDC00) + 0x10000.
  const cp = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
  // 3. Return the code point cp.
  return cp;
}
