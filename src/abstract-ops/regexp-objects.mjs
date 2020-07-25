import { surroundingAgent } from '../engine.mjs';
import { ParsePattern, isLineTerminator } from '../parse.mjs';
import { Descriptor, Type, Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { Evaluate_Pattern } from '../runtime-semantics/all.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  SameValue,
  Set,
  ToString,
} from './all.mjs';

// https://tc39.es/proposal-regexp-match-indices/#sec-match-records
export class MatchRecord {
  constructor(StartIndex, EndIndex) {
    Assert(Number.isInteger(StartIndex) && StartIndex >= 0);
    Assert(Number.isInteger(EndIndex) && EndIndex >= StartIndex);
    this.StartIndex = StartIndex;
    this.EndIndex = EndIndex;
  }
}

// #sec-regexpalloc
export function RegExpAlloc(newTarget) {
  const featureLegacyRegExp = surroundingAgent.feature('legacy-regexp');

  // 1. Let obj be ? OrdinaryCreateFromConstructor(newTarget, "%RegExpPrototype%", «[[RegExpMatcher]], [[OriginalSource]], [[OriginalFlags]]»).
  const obj = Q(OrdinaryCreateFromConstructor(newTarget, '%RegExp.prototype%', ['RegExpMatcher', 'OriginalSource', 'OriginalFlags',
    ...(featureLegacyRegExp ? ['Realm', 'LegacyFeaturesEnabled'] : [])]));

  // https://tc39.es/proposal-regexp-legacy-features/#sec-legacy-regexpalloc
  if (featureLegacyRegExp) {
    // Let obj be ? OrdinaryCreateFromConstructor(newTarget, "%RegExpPrototype%", «[[RegExpMatcher]], [[OriginalSource]], [[OriginalFlags]], [[Realm]], [[LegacyFeaturesEnabled]]»).
    // Let thisRealm be the current Realm Record.
    const thisRealm = surroundingAgent.currentRealmRecord;

    // Set obj.[[Realm]] to thisRealm.
    obj.Realm = thisRealm;

    // If SameValue(newTarget, thisRealm.[[Intrinsics]].[[%RegExp%]]) is true, then
    if (SameValue(newTarget, thisRealm.Intrinsics['%RegExp%']) === Value.true) {
      // Set obj.[[LegacyFeaturesEnabled]] to true.
      obj.LegacyFeaturesEnabled = Value.true;
    } else {
      // Else, set obj.[[LegacyFeaturesEnabled]] to false.
      obj.LegacyFeaturesEnabled = Value.false;
    }
  }

  // 2. Perform ! DefinePropertyOrThrow(obj, "lastIndex", PropertyDescriptor {[[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false}).
  X(DefinePropertyOrThrow(obj, new Value('lastIndex'), Descriptor({
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  // 3. Return obj.
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

// https://tc39.es/proposal-regexp-legacy-features/#sec-updatelegacyregexpstaticproperties
export function UpdateLegacyRegExpStaticProperties(C, S, startIndex, endIndex, capturedValues) {
  // 1. Assert C is an object that has a [[RegExpInput]] internal slot.
  Assert(Type(C) === 'Object' && 'RegExpInput' in C);

  // 2. Assert: Type(S) is String.
  Assert(Type(S) === 'String');

  // 3. Let len be the number of code units in S.
  const len = S.stringValue().length;

  // 4. Assert: startIndex and endIndex are integers such that 0 ≤ startIndex ≤ endIndex ≤ len.
  Assert(Number.isInteger(startIndex) && Number.isInteger(endIndex)
    && startIndex >= 0 && startIndex <= endIndex && endIndex <= len);

  // 5. Assert: capturedValues is a List of Strings.
  Assert(Array.isArray(capturedValues) && capturedValues.every((value) => Type(value) === 'String'));

  // 6. Let n be the number of elements in capturedValues.
  const n = capturedValues.length;

  // 7. Set C.[[RegExpInput]] to S.
  C.RegExpInput = S;

  // 8. Set C.[[RegExpLastMatch]] to a String whose length is endIndex - startIndex and containing
  // the code units from S with indices startIndex through endIndex - 1, in ascending order.
  C.RegExpLastMatch = new Value(S.stringValue().substring(startIndex, endIndex));

  if (n > 0) {
    // 9. If n > 0, set C.[[RegExpLastParen]] to the last element of capturedValues.
    C.RegExpLastParen = capturedValues[n - 1];
  } else {
    // 10. Else, set C.[[RegExpLastParen]] to the empty String.
    C.RegExpLastParen = new Value('');
  }

  // 11. Set C.[[RegExpLeftContext]] to a String whose length is startIndex and containing
  // the code units from S with indices 0 through startIndex - 1, in ascending order.
  C.RegExpLeftContext = new Value(S.stringValue().substring(0, startIndex));

  // 12. Set C.[[RegExpRightContext]] to a String whose length is len - endIndex and containing
  // the code units from S with indices endIndex through len - 1, in ascending order.
  C.RegExpRightContext = new Value(S.stringValue().substring(endIndex));

  // 13. For each integer i such that 1 ≤ i ≤ 9
  for (let i = 1; i <= 9; i += 1) {
    const slotName = `RegExpParen${i}`;
    if (i <= n) {
      // a. If i ≤ n, set C.[[RegExpParen_i_]] to the _i_th element of capturedValues.
      C[slotName] = capturedValues[i - 1];
    } else {
      // b. Else, set C.[[RegExpParen_i_]] to the empty String.
      C[slotName] = new Value('');
    }
  }
}

// https://tc39.es/proposal-regexp-legacy-features/#sec-invalidatelegacyregexpstaticproperties
export function InvalidateLegacyRegExpStaticProperties(C) {
  // 1. Assert C is an object that has a [[RegExpInput]] internal slot.
  Assert(Type(C) === 'Object' && 'RegExpInput' in C);

  // 2. Set the value of the following internal slots of C to empty:
  C.RegExpInput = undefined;
  C.RegExpLastMatch = undefined;
  C.RegExpLastParen = undefined;
  C.RegExpLeftContext = undefined;
  C.RegExpRightContext = undefined;
  C.RegExpParen1 = undefined;
  C.RegExpParen2 = undefined;
  C.RegExpParen3 = undefined;
  C.RegExpParen4 = undefined;
  C.RegExpParen5 = undefined;
  C.RegExpParen6 = undefined;
  C.RegExpParen7 = undefined;
  C.RegExpParen8 = undefined;
  C.RegExpParen9 = undefined;
}
