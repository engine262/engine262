import { surroundingAgent } from '../engine.mjs';
import { Descriptor, Value, Type } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { Evaluate_Pattern } from '../runtime-semantics/all.mjs';
import { ParsePattern } from '../parse.mjs';
import { isLineTerminator } from '../parser/Lexer.mjs';
import {
  ArrayCreate,
  Assert,
  CreateArrayFromList,
  CreateDataPropertyOrThrow,
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  OrdinaryObjectCreate,
  Set,
  ToString,
  F as 𝔽,
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
  const evaluatePattern = surroundingAgent.hostDefinedOptions.boost?.evaluatePattern || Evaluate_Pattern;
  obj.RegExpMatcher = evaluatePattern(parseResult, F.stringValue());
  // 15. Perform ? Set(obj, "lastIndex", +0𝔽, true).
  Q(Set(obj, new Value('lastIndex'), 𝔽(+0), Value.true));
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

// https://tc39.es/proposal-regexp-match-indices/#sec-getstringindex
export function GetStringIndex(S, Input, e) {
  // 1. Assert: Type(S) is String.
  Assert(Type(S) === 'String');
  // 2. Assert: Input is a List of the code points of S interpreted as a UTF-16 encoded string.
  Assert(Array.isArray(Input));
  // 3. Assert: e is an integer value ≥ 0 and < the number of elements in Input.
  Assert(e >= 0);
  // 4. Let eUTF be the smallest index into S that corresponds to the character at element e of Input.
  //    If e is greater than or equal to the number of elements in Input, then eUTF is the number of code units in S.
  let eUTF = 0;
  if (e >= Input.length) {
    eUTF = S.stringValue().length;
  } else {
    for (let i = 0; i < e; i += 1) {
      eUTF += Input[i].length;
    }
  }
  // 5. Return eUTF.
  return eUTF;
}

// https://tc39.es/proposal-regexp-match-indices/#sec-getmatchstring
export function GetMatchString(S, match) {
  // 1. Assert: Type(S) is String.
  Assert(Type(S) === 'String');
  // 2. Assert: match is a Match Record.
  Assert('StartIndex' in match && 'EndIndex' in match);
  // 3. Assert: match.[[StartIndex]] is an integer value ≥ 0 and < the length of S.
  Assert(match.StartIndex >= 0 && match.StartIndex <= S.stringValue().length);
  // 4. Assert: match.[[EndIndex]] is an integer value ≥ match.[[StartIndex]] and ≤ the length of S.
  Assert(match.EndIndex >= match.StartIndex && match.EndIndex <= S.stringValue().length);
  // 5. Return the portion of S between offset match.[[StartIndex]] inclusive and offset match.[[EndIndex]] exclusive.
  return new Value(S.stringValue().slice(match.StartIndex, match.EndIndex));
}

// https://tc39.es/proposal-regexp-match-indices/#sec-getmatchindicesarray
export function GetMatchIndicesArray(S, match) {
  // 1. Assert: Type(S) is String.
  Assert(Type(S) === 'String');
  // 2. Assert: match is a Match Record.
  Assert('StartIndex' in match && 'EndIndex' in match);
  // 3. Assert: match.[[StartIndex]] is an integer value ≥ 0 and < the length of S.
  Assert(match.StartIndex >= 0 && match.StartIndex <= S.stringValue().length);
  // 4. Assert: match.[[EndIndex]] is an integer value ≥ match.[[StartIndex]] and ≤ the length of S.
  Assert(match.EndIndex >= match.StartIndex && match.EndIndex <= S.stringValue().length);
  // 1. Return CreateArrayFromList(« match.[[StartIndex]], match.[[EndIndex]] »).
  return CreateArrayFromList([
    𝔽(match.StartIndex),
    𝔽(match.EndIndex),
  ]);
}

// https://tc39.es/proposal-regexp-match-indices/#sec-makeindicesarray
export function MakeIndicesArray(S, indices, groupNames) {
  // 1. Assert: Type(S) is String.
  Assert(Type(S) === 'String');
  // 2. Assert: indices is a List.
  Assert(Array.isArray(indices));
  // 3. Assert: groupNames is a List or is undefined.
  Assert(Array.isArray(indices) || groupNames === Value.undefined);
  // 4. Let n be the number of elements in indices.
  const n = indices.length;
  // 5. Assert: n < 2**32-1.
  Assert(n < (2 ** 32) - 1);
  // 6. Set A to ! ArrayCreate(n).
  // 7. Assert: The value of A's "length" property is n.
  const A = X(ArrayCreate(n));
  // 8. If groupNames is not undefined, then
  let groups;
  if (groupNames !== Value.undefined) {
    // a. Let groups be ! ObjectCreate(null).
    groups = X(OrdinaryObjectCreate(Value.null));
  } else { // 9. Else,
    // a. Let groups be undefined.
    groups = Value.undefined;
  }
  // 10. Perform ! CreateDataProperty(A, "groups", groups).
  X(CreateDataPropertyOrThrow(A, new Value('groups'), groups));
  // 11. For each integer i such that i ≥ 0 and i < n, do
  for (let i = 0; i < n; i += 1) {
    // a. Let matchIndices be indices[i].
    const matchIndices = indices[i];
    // b. If matchIndices is not undefined, then
    let matchIndicesArray;
    if (matchIndices !== Value.undefined) {
      // i. Let matchIndicesArray be ! GetMatchIndicesArray(S, matchIndices).
      matchIndicesArray = X(GetMatchIndicesArray(S, matchIndices));
    } else { // c. Else,
      // i. Let matchIndicesArray be undefined.
      matchIndicesArray = Value.undefined;
    }
    // d. Perform ! CreateDataProperty(A, ! ToString(𝔽(i)), matchIndicesArray).
    X(CreateDataPropertyOrThrow(A, X(ToString(𝔽(i))), matchIndicesArray));
    // e. If groupNames is not undefined and groupNames[i] is not undefined, then
    if (groupNames !== Value.undefined && groupNames[i] !== Value.undefined) {
      // i. Perform ! CreateDataProperty(groups, groupNames[i], matchIndicesArray).
      X(CreateDataPropertyOrThrow(groups, groupNames[i], matchIndicesArray));
    }
  }
  // 12. Return A.
  return A;
}
