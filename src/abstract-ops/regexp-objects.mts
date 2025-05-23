import { surroundingAgent } from '../host-defined/engine.mts';
import {
  Descriptor, Value, ObjectValue, BooleanValue, JSStringValue,
  UndefinedValue,
} from '../value.mts';
import { Q, X, type ValueEvaluator } from '../completion.mts';
import { CompilePattern, CountLeftCapturingParensWithin, type RegExpRecord } from '../runtime-semantics/all.mts';
import { ParsePattern } from '../parse.mts';
import { isLineTerminator } from '../parser/Lexer.mts';
import type { Mutable } from '../helpers.mts';
import type { RegExpObject } from '../intrinsics/RegExp.mts';
import {
  ArrayCreate,
  Assert,
  CreateArrayFromList,
  CreateDataPropertyOrThrow,
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  OrdinaryObjectCreate,
  SameValue,
  Set,
  ToString,
  F as toNumberValue,
  type FunctionObject,
} from './all.mts';

/** https://tc39.es/ecma262/#sec-regexpalloc */
export function* RegExpAlloc(newTarget: FunctionObject): ValueEvaluator<RegExpObject> {
  const obj = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%RegExp.prototype%', ['RegExpMatcher', 'OriginalSource', 'OriginalFlags'])) as Mutable<RegExpObject>;
  X(DefinePropertyOrThrow(obj, Value('lastIndex'), Descriptor({
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return obj;
}

/** https://tc39.es/ecma262/#sec-regexpinitialize */
export function* RegExpInitialize(obj: Mutable<RegExpObject>, pattern: Value, flags: Value) {
  let P: JSStringValue;
  // 1. If pattern is undefined, let P be the empty String.
  if (pattern === Value.undefined) {
    P = Value('');
  } else { // 2. Else, let P be ? ToString(pattern).
    P = Q(yield* ToString(pattern));
  }
  let F;
  // 3. If flags is undefined, let F be the empty String.
  if (flags === Value.undefined) {
    F = Value('');
  } else { // 4. Else, let F be ? ToString(flags).
    F = Q(yield* ToString(flags));
  }
  const f = F.stringValue();
  // 5. If F contains any code unit other than "d", "g", "i", "m", "s", "u", "v", or "y" or if it contains the same code unit more than once, throw a SyntaxError exception.
  if (/^[dgimsuvy]*$/.test(f) === false || (new globalThis.Set(f).size !== f.length)) {
    return surroundingAgent.Throw('SyntaxError', 'InvalidRegExpFlags', f);
  }
  const i = f.includes('i');
  const m = f.includes('m');
  const s = f.includes('s');
  const u = f.includes('u');
  const v = f.includes('v');

  // 11. If u is true or v is true, then
  //   a. Let patternText be StringToCodePoints(P).
  // 12. Else,
  //   a. Let patternText be the result of interpreting each of P's 16-bit elements as a Unicode BMP code point. UTF-16 decoding is not applied to the elements.
  const patternText = P.stringValue();

  const parseResult = ParsePattern(patternText, u, v);
  if (Array.isArray(parseResult)) {
    return surroundingAgent.Throw(parseResult[0], 'Raw', parseResult[0]);
  }
  obj.OriginalSource = P;
  obj.OriginalFlags = F;
  const capturingGroupsCount = CountLeftCapturingParensWithin(parseResult);
  const rer: RegExpRecord = {
    IgnoreCase: i,
    Multiline: m,
    DotAll: s,
    Unicode: u,
    UnicodeSets: v,
    CapturingGroupsCount: capturingGroupsCount,
  };
  obj.RegExpRecord = rer;
  obj.parsedPattern = parseResult;
  obj.RegExpMatcher = CompilePattern(parseResult, rer);
  Q(yield* Set(obj, Value('lastIndex'), toNumberValue(+0), Value.true));
  return obj;
}

/** https://tc39.es/ecma262/#sec-regexpcreate */
export function* RegExpCreate(P: Value, F: Value): ValueEvaluator<RegExpObject> {
  const obj = Q(yield* RegExpAlloc(surroundingAgent.intrinsic('%RegExp%')));
  return Q(yield* RegExpInitialize(obj, P, F));
}

/** https://tc39.es/ecma262/#sec-escaperegexppattern */
export function EscapeRegExpPattern(P: JSStringValue, _F: Value) {
  const source = P.stringValue();
  if (source === '') {
    return Value('(?:)');
  }
  let index = 0;
  let escaped = '';
  let inClass = false;
  let isEscape = false;
  while (index < source.length) {
    const c = source[index];
    switch (c) {
      case '\\':
        index += 1;
        if (isLineTerminator(source[index])) {
          // nothing
        } else {
          isEscape = !isEscape;
          escaped += '\\';
        }
        break;
      case '/':
        index += 1;
        if (inClass || isEscape) {
          isEscape = false;
          escaped += '/';
        } else {
          escaped += '\\/';
        }
        break;
      case '[':
        inClass = !isEscape;
        index += 1;
        escaped += '[';
        break;
      case ']':
        inClass = !isEscape;
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
    if (c !== '\\') {
      isEscape = false;
    }
  }
  return Value(escaped);
}

/** https://tc39.es/ecma262/#sec-getstringindex */
export function GetStringIndex(S: JSStringValue, Input: readonly string[], e: number) {
  // 1. Assert: Type(S) is String.
  Assert(S instanceof JSStringValue);
  // 2. Assert: Input is a List of the code points of S interpreted as a UTF-16 encoded string.
  Assert(Array.isArray(Input));
  // 3. Assert: e is an integer value ≥ 0.
  Assert(e >= 0);
  // 4. If S is the empty String, return 0.
  if (S.stringValue() === '') {
    return 0;
  }
  // 5. Let eUTF be the smallest index into S that corresponds to the character at element e of Input.
  //    If e is greater than or equal to the number of elements in Input, then eUTF is the number of code units in S.
  let eUTF = 0;
  if (e >= Input.length) {
    eUTF = S.stringValue().length;
  } else {
    for (let i = 0; i < e; i += 1) {
      eUTF += Input[i].length;
    }
  }
  // 6. Return eUTF.
  return eUTF;
}

export interface MatchRecord {
  readonly StartIndex: number;
  readonly EndIndex: number;
}
/** https://tc39.es/ecma262/#sec-getmatchstring */
export function GetMatchString(S: JSStringValue, match: MatchRecord) {
  // 1. Assert: Type(S) is String.
  Assert(S instanceof JSStringValue);
  // 2. Assert: match is a Match Record.
  Assert('StartIndex' in match && 'EndIndex' in match);
  // 3. Assert: match.[[StartIndex]] is an integer value ≥ 0 and ≤ the length of S.
  Assert(match.StartIndex >= 0 && match.StartIndex <= S.stringValue().length);
  // 4. Assert: match.[[EndIndex]] is an integer value ≥ match.[[StartIndex]] and ≤ the length of S.
  Assert(match.EndIndex >= match.StartIndex && match.EndIndex <= S.stringValue().length);
  // 5. Return the portion of S between offset match.[[StartIndex]] inclusive and offset match.[[EndIndex]] exclusive.
  return Value(S.stringValue().slice(match.StartIndex, match.EndIndex));
}

/** https://tc39.es/ecma262/#sec-getmatchindexpair */
export function GetMatchIndexPair(S: JSStringValue, match: MatchRecord) {
  // 1. Assert: Type(S) is String.
  Assert(S instanceof JSStringValue);
  // 2. Assert: match is a Match Record.
  Assert('StartIndex' in match && 'EndIndex' in match);
  // 3. Assert: match.[[StartIndex]] is an integer value ≥ 0 and ≤ the length of S.
  Assert(match.StartIndex >= 0 && match.StartIndex <= S.stringValue().length);
  // 4. Assert: match.[[EndIndex]] is an integer value ≥ match.[[StartIndex]] and ≤ the length of S.
  Assert(match.EndIndex >= match.StartIndex && match.EndIndex <= S.stringValue().length);
  // 1. Return CreateArrayFromList(« 𝔽(match.[[StartIndex]]), 𝔽(match.[[EndIndex]]) »).
  return CreateArrayFromList([
    toNumberValue(match.StartIndex),
    toNumberValue(match.EndIndex),
  ]);
}

/** https://tc39.es/ecma262/#sec-makematchindicesindexpairarray */
export function MakeMatchIndicesIndexPairArray(S: JSStringValue, indices: readonly (MatchRecord | UndefinedValue)[], groupNames: readonly (JSStringValue | UndefinedValue)[], hasGroups: BooleanValue) {
  // 1. Assert: Type(S) is String.
  Assert(S instanceof JSStringValue);
  // 2. Assert: indices is a List.
  Assert(Array.isArray(indices));
  // 3. Let n be the number of elements in indices.
  const n = indices.length;
  // 4. Assert: n < 2**32-1.
  Assert(n < (2 ** 32) - 1);
  // 5. Assert: groupNames is a List with _n_ - 1 elements.
  Assert(Array.isArray(groupNames) && groupNames.length === n - 1);
  // 6. NOTE: The groupNames List contains elements aligned with the indices List starting at indices[1].
  // 7. Assert: Type(hasGroups) is Boolean.
  Assert(hasGroups instanceof BooleanValue);
  // 8. Set A to ! ArrayCreate(n).
  // 9. Assert: The value of A's "length" property is n.
  const A = X(ArrayCreate(n));
  // 10. If hasGroups is true, then
  let groups: ObjectValue | UndefinedValue;
  if (hasGroups === Value.true) {
    // a. Let groups be ! ObjectCreate(null).
    groups = X(OrdinaryObjectCreate(Value.null));
  } else { // 9. Else,
    // b. Let groups be undefined.
    groups = Value.undefined;
  }
  // 11. Perform ! CreateDataProperty(A, "groups", groups).
  X(CreateDataPropertyOrThrow(A, Value('groups'), groups));
  // 12. For each integer i such that i ≥ 0 and i < n, do
  for (let i = 0; i < n; i += 1) {
    // a. Let matchIndices be indices[i].
    const matchIndices = indices[i];
    // b. If matchIndices is not undefined, then
    let matchIndicesArray;
    if (matchIndices !== Value.undefined) {
      // i. Let matchIndicesArray be ! GetMatchIndexPair(S, matchIndices).
      matchIndicesArray = X(GetMatchIndexPair(S, matchIndices as MatchRecord));
    } else { // c. Else,
      // i. Let matchIndicesArray be undefined.
      matchIndicesArray = Value.undefined;
    }
    // d. Perform ! CreateDataProperty(A, ! ToString(𝔽(i)), matchIndicesArray).
    X(CreateDataPropertyOrThrow(A, X(ToString(toNumberValue(i))), matchIndicesArray));
    // e. If i > 0 and groupNames[i - 1] is not undefined, then
    if (i > 0 && groupNames[i - 1] !== Value.undefined) {
      // i. Perform ! CreateDataProperty(groups, groupNames[i - 1], matchIndicesArray).
      X(CreateDataPropertyOrThrow(groups as ObjectValue, groupNames[i - 1] as JSStringValue, matchIndicesArray));
    }
  }
  // 13. Return A.
  return A;
}

/** https://tc39.es/ecma262/#sec-regexphasflag */
export function RegExpHasFlag(R: Value, codeUnit: string) {
  // 1. If Type(R) is not Object, throw a TypeError exception.
  if (!(R instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  // 2. If R does not have an [[OriginalFlags]] internal slot, then
  if (!('OriginalFlags' in R)) {
    // a. If SameValue(R, %RegExp.prototype%) is true, return undefined.
    if (SameValue(R, surroundingAgent.intrinsic('%RegExp.prototype%')) === Value.true) {
      return Value.undefined;
    }
    // b. Otherwise, throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  // 3. Let flags be R.[[OriginalFlags]].
  const flags = (R as RegExpObject).OriginalFlags.stringValue();
  // 4. If flags contains codeUnit, return true.
  if (flags.includes(codeUnit)) {
    return Value.true;
  }
  // 5. Return false.
  return Value.false;
}
