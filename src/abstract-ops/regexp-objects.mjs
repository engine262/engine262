import { surroundingAgent } from '../engine.mjs';
import { ParsePattern, isLineTerminator } from '../parse.mjs';
import { Descriptor, Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { Evaluate_Pattern } from '../runtime-semantics/all.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  Set,
  ToString,
} from './all.mjs';

// #sec-regexpalloc
export function RegExpAlloc(newTarget) {
  const obj = Q(OrdinaryCreateFromConstructor(newTarget, '%RegExp.prototype%', ['RegExpMatcher', 'OriginalSource', 'OriginalFlags']));
  X(DefinePropertyOrThrow(obj, new Value('lastIndex'), Descriptor({
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return obj;
}

// #sec-regexpinitialize
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
  // 6. If F contains "u", let u be true; else let u be false.
  const u = f.includes('u');
  // 7. If u is true, then
  //   a. Let patternText be ! UTF16DecodeString(P).
  //   b. Let patternCharacters be a List whose elements are the code points of patternText.
  // 8. Else,
  //   a. Let patternText be the result of interpreting each of P's 16-bit elements as a Unicode BMP code point. UTF-16 decoding is not applied to the elements.
  //   b. Let patternCharacters be a List whose elements are the code unit elements of P.
  // 9. Let parseResult be ParsePattern(patternText, u).
  const patternText = P.stringValue();
  const parseResult = ParsePattern(patternText, u);
  // 10. If parseResult is a non-empty List of SyntaxError objects, throw a SyntaxError exception.
  if (Array.isArray(parseResult)) {
    return surroundingAgent.Throw(parseResult[0]);
  }
  obj.parsedPattern = parseResult;
  // 11. Assert: parseResult is a Parse Node for Pattern.
  Assert(parseResult.type === 'Pattern');
  // 12. Set obj.[[OriginalSource]] to P.
  obj.OriginalSource = P;
  // 13. Set obj.[[OriginalFlags]] to F.
  obj.OriginalFlags = F;
  // 14. Set obj.[[RegExpMatcher]] to the Abstract Closure that evaluates parseResult by
  //     applying the semantics provided in 21.2.2 using patternCharacters as the pattern's
  //     List of SourceCharacter values and F as the flag parameters.
  obj.RegExpMatcher = Evaluate_Pattern(parseResult, F.stringValue());
  // 15. Perform ? Set(obj, "lastIndex", 0, true).
  Q(Set(obj, new Value('lastIndex'), new Value(0), Value.true));
  // 16. Return obj.
  return obj;
}

// 21.2.3.2.3 #sec-regexpcreate
export function RegExpCreate(P, F) {
  const obj = Q(RegExpAlloc(surroundingAgent.intrinsic('%RegExp%')));
  return Q(RegExpInitialize(obj, P, F));
}

// #sec-escaperegexppattern
export function EscapeRegExpPattern(P, _F) {
  const source = P.stringValue();
  if (source === '') {
    return new Value('(:?)');
  }
  let index = 0;
  let escaped = '';
  let inClass = false;
  while (index < source.length) {
    const c = source[index];
    switch (c) {
      case '\\':
        index += 1;
        if (isLineTerminator(source[index])) {
          // nothing
        } else {
          escaped += '\\';
        }
        break;
      case '/':
        index += 1;
        if (inClass) {
          escaped += '/';
        } else {
          escaped += '\\/';
        }
        break;
      case '[':
        inClass = true;
        index += 1;
        escaped += '[';
        break;
      case ']':
        inClass = false;
        index += 1;
        escaped += ']';
        break;
      case '\n':
        index += 1;
        escaped += '\\n';
        break;
      case '\r':
        index += 1;
        escaped += '\\r';
        break;
      case '\u2028':
        index += 1;
        escaped += '\\u2028';
        break;
      case '\u2029':
        index += 1;
        escaped += '\\u2029';
        break;
      default:
        index += 1;
        escaped += c;
        break;
    }
  }
  return new Value(escaped);
}
