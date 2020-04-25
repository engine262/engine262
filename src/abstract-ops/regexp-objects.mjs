import { surroundingAgent } from '../engine.mjs';
import { ParseRegExp } from '../parse.mjs';
import { Descriptor, Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { getMatcher } from '../runtime-semantics/all.mjs';
import {
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  Set,
  ToString,
} from './all.mjs';

// 21.2.3.2.1 #sec-regexpalloc
export function RegExpAlloc(newTarget) {
  const obj = Q(OrdinaryCreateFromConstructor(newTarget, '%RegExp.prototype%', ['RegExpMatcher', 'OriginalSource', 'OriginalFlags']));
  X(DefinePropertyOrThrow(obj, new Value('lastIndex'), Descriptor({
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return obj;
}

// 21.2.3.2.2 #sec-regexpinitialize
export function RegExpInitialize(obj, pattern, flags) {
  let P;
  // 1. If pattern is undefined, let P be the empty String.
  if (pattern === Value.undefined) {
    P = new Value('');
  } else { // 2. Else, let P be ? ToString(pattern).
    P = Q(ToString(pattern));
  }
  let F;
  // 3. If flags is undefined, let F be the empty String.
  if (flags === Value.undefined) {
    F = new Value('');
  } else { // 4. Else, let F be ? ToString(flags).
    F = Q(ToString(flags));
  }
  const f = F.stringValue();
  // 5. If F contains any code unit other than "g", "i", "m", "s", "u", or "y" or if it contains the same code unit more than once, throw a SyntaxError exception.
  if (/^[gimsuy]*$/.test(f) === false || (new globalThis.Set(f).size !== f.length)) {
    return surroundingAgent.Throw('SyntaxError', 'InvalidRegExpFlags', f);
  }
  // 6. If F contains "u", let BMP be false; else let BMP be true.
  const BMP = !f.includes('u');
  // 7. If BMP is true, then
  //   a. Let pText be the sequence of code points resulting from interpreting each of the 16-bit
  //      elements of P as a Unicode BMP code point. UTF-16 decoding is not applied to the elements.
  //   b. Parse pText using the grammars in 21.2.1. The goal symbol for the parse is Pattern[~U, ~N].
  //      If the result of parsing contains a GroupName, reparse with the goal symbol Pattern[~U, +N]
  //      and use this result instead. Throw a SyntaxError exception if pText did not conform to the
  //      grammar, if any elements of pText were not matched by the parse, or if any Early Error conditions exist.
  //   c. Let patternCharacters be a List whose elements are the code unit elements of P.
  // 8. Else,
  //   a. Let pText be ! UTF16DecodeString(P).
  //   b. Parse pText using the grammars in 21.2.1. The goal symbol for the parse is Pattern[+U, +N].
  //      Throw a SyntaxError exception if pText did not conform to the grammar, if any elements of
  //      pText were not matched by the parse, or if any Early Error conditions exist.
  //   c. Let patternCharacters be a List whose elements are the code points of pText.
  const patternCharacters = Q(ParseRegExp(pattern, BMP));
  // 9. Set obj.[[OriginalSource]] to P.
  obj.OriginalSource = P;
  // 10. Set obj.[[OriginalFlags]] to F.
  obj.OriginalFlags = F;
  // 11. Set obj.[[RegExpMatcher]] to the abstract closure that evaluates the above parse by
  //     applying the semantics provided in 21.2.2 using patternCharacters as the pattern's
  //     List of SourceCharacter values and F as the flag parameters.
  obj.RegExpMatcher = getMatcher(patternCharacters, F);
  // 12. Perform ? Set(obj, "lastIndex", 0, true).
  Q(Set(obj, new Value('lastIndex'), new Value(0), Value.true));
  // 13. Return obj.
  return obj;
}

// 21.2.3.2.3 #sec-regexpcreate
export function RegExpCreate(P, F) {
  const obj = Q(RegExpAlloc(surroundingAgent.intrinsic('%RegExp%')));
  return Q(RegExpInitialize(obj, P, F));
}

// #sec-escaperegexppattern
export function EscapeRegExpPattern(P, F) {
  // TODO: implement this without host
  const re = new RegExp(P.stringValue(), F.stringValue());
  return new Value(re.source);
}
