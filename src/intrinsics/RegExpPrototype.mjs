import { surroundingAgent } from '../engine.mjs';
import {
  BooleanValue,
  NullValue,
  JSStringValue,
  ObjectValue,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  ArrayCreate,
  Assert,
  Call,
  Construct,
  CreateDataProperty,
  CreateDataPropertyOrThrow,
  EscapeRegExpPattern,
  Get,
  GetMatchString,
  GetStringIndex,
  IsCallable,
  isNonNegativeInteger,
  LengthOfArrayLike,
  MakeMatchIndicesIndexPairArray,
  OrdinaryObjectCreate,
  RequireInternalSlot,
  SameValue,
  Set,
  SpeciesConstructor,
  ToBoolean,
  ToIntegerOrInfinity,
  ToLength,
  ToObject,
  ToString,
  ToUint32,
  RegExpHasFlag,
  F,
} from '../abstract-ops/all.mjs';
import { RegExpState as State, GetSubstitution } from '../runtime-semantics/all.mjs';
import { CodePointAt } from '../static-semantics/all.mjs';
import { Q, X } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';
import { CreateRegExpStringIterator } from './RegExpStringIteratorPrototype.mjs';


/** http://tc39.es/ecma262/#sec-regexp.prototype.exec */
function RegExpProto_exec([string = Value.undefined], { thisValue }) {
  const R = thisValue;
  Q(RequireInternalSlot(R, 'RegExpMatcher'));
  const S = Q(ToString(string));
  return Q(RegExpBuiltinExec(R, S));
}

/** http://tc39.es/ecma262/#sec-regexpexec */
export function RegExpExec(R, S) {
  Assert(R instanceof ObjectValue);
  Assert(S instanceof JSStringValue);

  const exec = Q(Get(R, new Value('exec')));
  if (IsCallable(exec) === Value.true) {
    const result = Q(Call(exec, R, [S]));
    if (!(result instanceof ObjectValue) && !(result instanceof NullValue)) {
      return surroundingAgent.Throw('TypeError', 'RegExpExecNotObject', result);
    }
    return result;
  }
  Q(RequireInternalSlot(R, 'RegExpMatcher'));
  return Q(RegExpBuiltinExec(R, S));
}

/** http://tc39.es/ecma262/#sec-regexpbuiltinexec */
export function RegExpBuiltinExec(R, S) {
  // 1. Assert: R is an initialized RegExp instance.
  Assert('RegExpMatcher' in R);
  // 2. Assert: Type(S) is String.
  Assert(S instanceof JSStringValue);
  // 3. Let length be the number of code units in S.
  const length = S.stringValue().length;
  // 4. Let lastIndex be ? ℝ(ToLength(? Get(R, "lastIndex"))).
  let lastIndex = Q(ToLength(Q(Get(R, new Value('lastIndex'))))).numberValue();
  // 5. Let flags be R.[[OriginalFlags]].
  const flags = R.OriginalFlags.stringValue();
  // 6. If flags contains "g", let global be true; else let global be false.
  const global = flags.includes('g');
  // 7. If flags contains "y", let sticky be true; else let sticky be false.
  const sticky = flags.includes('y');
  // 8. If flags contains "d", let hasIndices be true; else let hasIndices be false.
  const hasIndices = flags.includes('d');
  // 9. If global is false and sticky is false, set lastIndex to 0.
  if (!global && !sticky) {
    lastIndex = 0;
  }
  // 10. Let matcher be R.[[RegExpMatcher]].
  const matcher = R.RegExpMatcher;
  // 11. If flags contains "u", let fullUnicode be true; else let fullUnicode be false.
  const fullUnicode = flags.includes('u');
  // 12. Let matchSucceeded be false.
  let matchSucceeded = false;
  let r;
  // 13. Repeat, while matchSucceeded is false
  while (matchSucceeded === false) {
    // a. If lastIndex > length, then
    if (lastIndex > length) {
      // i. If global is true or sticky is true, then
      if (global || sticky) {
        // 1. Perform ? Set(R, "lastIndex", +0𝔽, true).
        Q(Set(R, new Value('lastIndex'), F(+0), Value.true));
      }
      // ii. Return null.
      return Value.null;
    }
    // b. Let r be matcher(S, lastIndex).
    r = matcher(S, lastIndex);
    // c. If r is failure, then
    if (r === 'failure') {
      // i. If sticky is true, then
      if (sticky) {
        // 1. Perform ? Set(R, "lastIndex", +0𝔽, true).
        Q(Set(R, new Value('lastIndex'), F(+0), Value.true));
        // 2. Return null.
        return Value.null;
      }
      // ii. Set lastIndex to AdvanceStringIndex(S, lastIndex, fullUnicode).
      lastIndex = AdvanceStringIndex(S, lastIndex, fullUnicode ? Value.true : Value.false);
    } else { // d. Else,
      // i. Assert: r is a State.
      Assert(r instanceof State);
      // ii. Set matchSucceeded to true.
      matchSucceeded = true;
    }
  }
  // 14. Let e be r's endIndex value.
  let e = r.endIndex;
  const Input = fullUnicode ? Array.from(S.stringValue()) : S.stringValue().split('');
  // 15. If fullUnicode is true, then
  if (fullUnicode) {
    // If fullUnicode is true, set e to ! GetStringIndex(S, Input, e).
    e = X(GetStringIndex(S, Input, e));
  }
  // 16. If global is true or sticky is true, then
  if (global || sticky) {
    // a. Perform ? Set(R, "lastIndex", 𝔽(e), true).
    Q(Set(R, new Value('lastIndex'), F(e), Value.true));
  }
  // 17. Let n be the number of elements in r's captures List.
  const n = r.captures.length - 1;
  // 18. Assert: n = R.[[RegExpRecord]].[[CapturingGroupsCount]].
  Assert(n === R.parsedPattern.capturingGroups.length);
  // 19. Assert: n < 2^32 - 1.
  Assert(n < (2 ** 32) - 1);
  // 20. Let A be ! ArrayCreate(n + 1).
  const A = X(ArrayCreate(n + 1));
  // 21. Assert: The mathematical value of A's "length" property is n + 1.
  Assert(X(Get(A, new Value('length'))).numberValue() === n + 1);
  // 22. Perform ! CreateDataPropertyOrThrow(A, "index", 𝔽(lastIndex)).
  X(CreateDataPropertyOrThrow(A, new Value('index'), F(lastIndex)));
  // 23. Perform ! CreateDataPropertyOrThrow(A, "input", S).
  X(CreateDataPropertyOrThrow(A, new Value('input'), S));
  // 24. Let match be the Match Record { [[StartIndex]]: lastIndex, [[EndIndex]]: e }.
  const match = { StartIndex: lastIndex, EndIndex: e };
  // 25. Let indices be a new empty List.
  const indices = [];
  // 26. Let groupNames be a new empty List.
  const groupNames = [];
  // 27. Append match to indices.
  indices.push(match);
  // 28. Let matchedValue be ! GetMatchString(S, match).
  const matchedValue = X(GetMatchString(S, match));
  // 29. Perform ! CreateDataProperty(A, "0", matchedValue).
  X(CreateDataPropertyOrThrow(A, new Value('0'), matchedValue));
  let groups;
  let hasGroups;
  // 30. If R contains any GroupName, then
  if (R.parsedPattern.groupSpecifiers.size > 0) {
    // a. Let groups be OrdinaryObjectCreate(null).
    groups = OrdinaryObjectCreate(Value.null);
    // b. Let hasGroups be true.
    hasGroups = Value.true;
  } else { // 31. Else,
    // a. Let groups be undefined.
    groups = Value.undefined;
    // b. Let hasGroups be false.
    hasGroups = Value.false;
  }
  // 32. Perform ! CreateDataPropertyOrThrow(A, "groups", groups).
  X(CreateDataPropertyOrThrow(A, new Value('groups'), groups));
  // 33. For each integer i such that i > 0 and i ≤ n, do
  for (let i = 1; i <= n; i += 1) {
    // a. Let captureI be ith element of r's captures List.
    const captureI = r.captures[i];
    let capturedValue;
    // e. If captureI is undefined, then
    if (captureI === Value.undefined) {
      // i. Let capturedValue be undefined.
      capturedValue = Value.undefined;
      // ii. Append undefined to indices.
      indices.push(Value.undefined);
    } else { // f. Else,
      // i. Let captureStart be captureI's startIndex.
      let captureStart = captureI.startIndex;
      // ii. Let captureEnd be captureI's endIndex.
      let captureEnd = captureI.endIndex;
      // iii. If fullUnicode is true, then
      if (fullUnicode) {
        // 1. Set captureStart to ! GetStringIndex(S, Input, captureStart).
        captureStart = X(GetStringIndex(S, Input, captureStart));
        // 2. Set captureEnd to ! GetStringIndex(S, Input, captureEnd).
        captureEnd = X(GetStringIndex(S, Input, captureEnd));
      }
      // iv. Let capture be the Match { [[StartIndex]]: captureStart, [[EndIndex]:: captureEnd }.
      const capture = { StartIndex: captureStart, EndIndex: captureEnd };
      // v. Let capturedValue be ! GetMatchString(S, capture).
      capturedValue = X(GetMatchString(S, capture));
      // vi. Append capture to indices.
      indices.push(capture);
    }
    // e. Perform ! CreateDataPropertyOrThrow(A, ! ToString(𝔽(i)), capturedValue).
    X(CreateDataPropertyOrThrow(A, X(ToString(F(i))), capturedValue));
    // f. If the ith capture of R was defined with a GroupName, then
    if (R.parsedPattern.capturingGroups[i - 1].GroupSpecifier) {
      // i. Let s be the StringValue of the corresponding RegExpIdentifierName.
      const s = new Value(R.parsedPattern.capturingGroups[i - 1].GroupSpecifier);
      // ii. Perform ! CreateDataPropertyOrThrow(groups, s, capturedValue).
      X(CreateDataPropertyOrThrow(groups, s, capturedValue));
      // iii. Append s to groupNames.
      groupNames.push(s);
    } else {
      // i. Append undefined to groupNames.
      groupNames.push(Value.undefined);
    }
  }
  // 34. If hasIndices is true, then
  if (hasIndices) {
    // a. Let indicesArray be MakeMatchIndicesIndexPairArray(S, indices, groupNames, hasGroups).
    const indicesArray = MakeMatchIndicesIndexPairArray(S, indices, groupNames, hasGroups);
    // b. Perform ! CreateDataProperty(A, "indices", indicesArray).
    X(CreateDataPropertyOrThrow(A, new Value('indices'), indicesArray));
  }
  // 35. Return A.
  return A;
}

/** http://tc39.es/ecma262/#sec-advancestringindex */
export function AdvanceStringIndex(S, index, unicode) {
  // 1. Assert: Type(S) is String.
  Assert(S instanceof JSStringValue);
  // 2. Assert: index is a non-negative integer which is ≤ 2 ** (53 - 1).
  Assert(isNonNegativeInteger(index) && index <= (2 ** 53) - 1);
  // 3. Assert: Type(unicode) is Boolean.
  Assert(unicode instanceof BooleanValue);
  // 4. If unicode is false, return index + 1.
  if (unicode === Value.false) {
    return index + 1;
  }
  // 5. Let length be the number of code units in S.
  const length = S.stringValue().length;
  // 6. If index + 1 ≥ length, return index + 1.
  if (index + 1 >= length) {
    return index + 1;
  }
  // 7. Let cp be ! CodePointAt(S, index).
  const cp = X(CodePointAt(S.stringValue(), index));
  // 8. Return index + cp.[[CodeUnitCount]].
  return index + cp.CodeUnitCount;
}

/** http://tc39.es/ecma262/#sec-get-regexp.prototype.dotAll */
function RegExpProto_dotAllGetter(args, { thisValue }) {
  // 1. Let R be the this value.
  const R = thisValue;
  // 2. Let cu be the code unit 0x0073 (LATIN SMALL LETTER S).
  const cu = 's';
  // 3. Return ? RegExpHasFlag(R, cu).
  return Q(RegExpHasFlag(R, cu));
}

/** http://tc39.es/ecma262/#sec-get-regexp.prototype.flags */
function RegExpProto_flagsGetter(args, { thisValue }) {
  const R = thisValue;
  if (!(R instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  let result = '';
  const hasIndices = ToBoolean(Q(Get(R, new Value('hasIndices'))));
  if (hasIndices === Value.true) {
    result += 'd';
  }
  const global = ToBoolean(Q(Get(R, new Value('global'))));
  if (global === Value.true) {
    result += 'g';
  }
  const ignoreCase = ToBoolean(Q(Get(R, new Value('ignoreCase'))));
  if (ignoreCase === Value.true) {
    result += 'i';
  }
  const multiline = ToBoolean(Q(Get(R, new Value('multiline'))));
  if (multiline === Value.true) {
    result += 'm';
  }
  const dotAll = ToBoolean(Q(Get(R, new Value('dotAll'))));
  if (dotAll === Value.true) {
    result += 's';
  }
  const unicode = ToBoolean(Q(Get(R, new Value('unicode'))));
  if (unicode === Value.true) {
    result += 'u';
  }
  const sticky = ToBoolean(Q(Get(R, new Value('sticky'))));
  if (sticky === Value.true) {
    result += 'y';
  }
  return new Value(result);
}

/** http://tc39.es/ecma262/#sec-get-regexp.prototype.global */
function RegExpProto_globalGetter(args, { thisValue }) {
  const R = thisValue;
  if (!(R instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExp.prototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const flags = R.OriginalFlags;
  if (flags.stringValue().includes('g')) {
    return Value.true;
  }
  return Value.false;
}

/** http://tc39.es/ecma262/#sec-get-regexp.prototype.hasIndices */
function RegExpProto_hasIndicesGetter(args, { thisValue }) {
  // 1. Let R be the this value.
  const R = thisValue;
  // 2. Let cu be the code unit 0x0073 (LATIN SMALL LETTER D).
  const cu = 'd';
  // 3. Return ? RegExpHasFlag(R, cu).
  return Q(RegExpHasFlag(R, cu));
}

/** http://tc39.es/ecma262/#sec-get-regexp.prototype.ignorecase */
function RegExpProto_ignoreCaseGetter(args, { thisValue }) {
  // 1. Let R be the this value.
  const R = thisValue;
  // 2. Let cu be the code unit 0x0069 (LATIN SMALL LETTER I).
  const cu = 'i';
  // 3. Return ? RegExpHasFlag(R, cu).
  return Q(RegExpHasFlag(R, cu));
}

/** http://tc39.es/ecma262/#sec-regexp.prototype-@@match */
function RegExpProto_match([string = Value.undefined], { thisValue }) {
  // 1. Let rx be the this value.
  const rx = thisValue;
  // 2. If Type(rx) is not Object, throw a TypeError exception.
  if (!(rx instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', rx);
  }
  // 3. Let S be ? ToString(string).
  const S = Q(ToString(string));
  // 4. Let global be ! ToBoolean(? Get(rx, "global")).
  const global = ToBoolean(Q(Get(rx, new Value('global'))));
  // 5. If global is false, then
  if (global === Value.false) {
    // a. Return ? RegExpExec(rx, S).
    return Q(RegExpExec(rx, S));
  } else { // 6. Else,
    // a. Assert: global is true.
    Assert(global === Value.true);
    // b. Let fullUnicode be ! ToBoolean(? Get(rx, "unicode")).
    const fullUnicode = ToBoolean(Q(Get(rx, new Value('unicode'))));
    // c. Perform ? Set(rx, "lastIndex", +0𝔽, true).
    Q(Set(rx, new Value('lastIndex'), F(+0), Value.true));
    // d. Let A be ! ArrayCreate(0).
    const A = X(ArrayCreate(0));
    // e. Let n be 0.
    let n = 0;
    // f. Repeat,
    while (true) {
      // i. Let result be ? RegExpExec(rx, S).
      const result = Q(RegExpExec(rx, S));
      // ii. If result is null, then
      if (result === Value.null) {
        // 1. If n = 0, return null.
        if (n === 0) {
          return Value.null;
        }
        // 2. Return A.
        return A;
      } else { // iii. Else,
        // 1. Let matchStr be ? ToString(? Get(result, "0")).
        const matchStr = Q(ToString(Q(Get(result, new Value('0')))));
        // 2. Perform ! CreateDataPropertyOrThrow(A, ! ToString(𝔽(n)), matchStr).
        X(CreateDataPropertyOrThrow(A, X(ToString(F(n))), matchStr));
        // 3. If matchStr is the empty String, then
        if (matchStr.stringValue() === '') {
          // a. Let thisIndex be ℝ(? ToLength(? Get(rx, "lastIndex"))).
          const thisIndex = Q(ToLength(Q(Get(rx, new Value('lastIndex'))))).numberValue();
          // b. Let nextIndex be AdvanceStringIndex(S, thisIndex, fullUnicode).
          const nextIndex = AdvanceStringIndex(S, thisIndex, fullUnicode);
          // c. Perform ? Set(rx, "lastIndex", 𝔽(nextIndex), true).
          Q(Set(rx, new Value('lastIndex'), F(nextIndex), Value.true));
        }
        // 4. Set n to n + 1.
        n += 1;
      }
    }
  }
}

/** http://tc39.es/ecma262/#sec-regexp-prototype-matchall */
function RegExpProto_matchAll([string = Value.undefined], { thisValue }) {
  const R = thisValue;
  if (!(R instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const S = Q(ToString(string));
  const C = Q(SpeciesConstructor(R, surroundingAgent.intrinsic('%RegExp%')));
  const flags = Q(ToString(Q(Get(R, new Value('flags')))));
  const matcher = Q(Construct(C, [R, flags]));
  const lastIndex = Q(ToLength(Q(Get(R, new Value('lastIndex')))));
  Q(Set(matcher, new Value('lastIndex'), lastIndex, Value.true));
  let global;
  if (flags.stringValue().includes('g')) {
    global = Value.true;
  } else {
    global = Value.false;
  }
  let fullUnicode;
  if (flags.stringValue().includes('u')) {
    fullUnicode = Value.true;
  } else {
    fullUnicode = Value.false;
  }
  return X(CreateRegExpStringIterator(matcher, S, global, fullUnicode));
}

/** http://tc39.es/ecma262/#sec-get-regexp.prototype.multiline */
function RegExpProto_multilineGetter(args, { thisValue }) {
  // 1. Let R be the this value.
  const R = thisValue;
  // 2. Let cu be the code unit 0x006D (LATIN SMALL LETTER M).
  const cu = 'm';
  // 3. Return ? RegExpHasFlag(R, cu).
  return Q(RegExpHasFlag(R, cu));
}

/** http://tc39.es/ecma262/#sec-regexp.prototype-@@replace */
function RegExpProto_replace([string = Value.undefined, replaceValue = Value.undefined], { thisValue }) {
  const rx = thisValue;
  if (!(rx instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', rx);
  }
  const S = Q(ToString(string));
  const lengthS = S.stringValue().length;
  const functionalReplace = IsCallable(replaceValue);
  if (functionalReplace === Value.false) {
    replaceValue = Q(ToString(replaceValue));
  }
  const global = ToBoolean(Q(Get(rx, new Value('global'))));
  let fullUnicode;
  if (global === Value.true) {
    fullUnicode = ToBoolean(Q(Get(rx, new Value('unicode'))));
    Q(Set(rx, new Value('lastIndex'), F(+0), Value.true));
  }

  const results = [];
  let done = false;
  while (!done) {
    const result = Q(RegExpExec(rx, S));
    if (result === Value.null) {
      done = true;
    } else {
      results.push(result);
      if (global === Value.false) {
        done = true;
      } else {
        const matchStr = Q(ToString(Q(Get(result, new Value('0')))));
        if (matchStr.stringValue() === '') {
          const thisIndex = Q(ToLength(Q(Get(rx, new Value('lastIndex'))))).numberValue();
          const nextIndex = AdvanceStringIndex(S, thisIndex, fullUnicode);
          Q(Set(rx, new Value('lastIndex'), F(nextIndex), Value.true));
        }
      }
    }
  }

  let accumulatedResult = '';
  let nextSourcePosition = 0;
  for (const result of results) {
    let nCaptures = Q(LengthOfArrayLike(result));
    nCaptures = Math.max(nCaptures - 1, 0);

    const matched = Q(ToString(Q(Get(result, new Value('0')))));
    const matchLength = matched.stringValue().length;

    let position = Q(ToIntegerOrInfinity(Q(Get(result, new Value('index')))));
    position = Math.max(Math.min(position, lengthS), 0);

    let n = 1;
    const captures = [];
    while (n <= nCaptures) {
      let capN = Q(Get(result, X(ToString(F(n)))));
      if (capN !== Value.undefined) {
        capN = Q(ToString(capN));
      }
      captures.push(capN);
      n += 1;
    }

    let namedCaptures = Q(Get(result, new Value('groups')));

    let replacement;
    if (functionalReplace === Value.true) {
      const replacerArgs = [matched];
      replacerArgs.push(...captures);
      replacerArgs.push(F(position), S);
      if (namedCaptures !== Value.undefined) {
        replacerArgs.push(namedCaptures);
      }
      const replValue = Q(Call(replaceValue, Value.undefined, replacerArgs));
      replacement = Q(ToString(replValue));
    } else {
      if (namedCaptures !== Value.undefined) {
        namedCaptures = Q(ToObject(namedCaptures));
      }
      replacement = Q(GetSubstitution(matched, S, position, captures, namedCaptures, replaceValue));
    }

    if (position >= nextSourcePosition) {
      accumulatedResult = accumulatedResult + S.stringValue().substring(nextSourcePosition, position) + replacement.stringValue();
      nextSourcePosition = position + matchLength;
    }
  }

  if (nextSourcePosition >= lengthS) {
    return new Value(accumulatedResult);
  }

  return new Value(accumulatedResult + S.stringValue().substring(nextSourcePosition));
}

/** http://tc39.es/ecma262/#sec-regexp.prototype-@@search */
function RegExpProto_search([string = Value.undefined], { thisValue }) {
  const rx = thisValue;
  if (!(rx instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', rx);
  }
  const S = Q(ToString(string));

  const previousLastIndex = Q(Get(rx, new Value('lastIndex')));
  if (SameValue(previousLastIndex, F(+0)) === Value.false) {
    Q(Set(rx, new Value('lastIndex'), F(+0), Value.true));
  }

  const result = Q(RegExpExec(rx, S));
  const currentLastIndex = Q(Get(rx, new Value('lastIndex')));
  if (SameValue(currentLastIndex, previousLastIndex) === Value.false) {
    Q(Set(rx, new Value('lastIndex'), previousLastIndex, Value.true));
  }

  if (result === Value.null) {
    return F(-1);
  }

  return Q(Get(result, new Value('index')));
}

/** http://tc39.es/ecma262/#sec-get-regexp.prototype.source */
function RegExpProto_sourceGetter(args, { thisValue }) {
  const R = thisValue;
  if (!(R instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  if (!('OriginalSource' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExp.prototype%')) === Value.true) {
      return new Value('(?:)');
    }
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  Assert('OriginalFlags' in R);
  const src = R.OriginalSource;
  const flags = R.OriginalFlags;
  return EscapeRegExpPattern(src, flags);
}

/** http://tc39.es/ecma262/#sec-regexp.prototype-@@split */
function RegExpProto_split([string = Value.undefined, limit = Value.undefined], { thisValue }) {
  const rx = thisValue;
  if (!(rx instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', rx);
  }
  const S = Q(ToString(string));

  const C = Q(SpeciesConstructor(rx, surroundingAgent.intrinsic('%RegExp%')));
  const flagsValue = Q(Get(rx, new Value('flags')));
  const flags = Q(ToString(flagsValue)).stringValue();
  const unicodeMatching = flags.includes('u') ? Value.true : Value.false;
  const newFlags = flags.includes('y') ? new Value(flags) : new Value(`${flags}y`);
  const splitter = Q(Construct(C, [rx, newFlags]));

  const A = X(ArrayCreate(0));
  let lengthA = 0;

  let lim;
  if (limit === Value.undefined) {
    lim = (2 ** 32) - 1;
  } else {
    lim = Q(ToUint32(limit)).numberValue();
  }

  const size = S.stringValue().length;
  let p = 0;

  if (lim === 0) {
    return A;
  }

  if (size === 0) {
    const z = Q(RegExpExec(splitter, S));
    if (z !== Value.null) {
      return A;
    }
    X(CreateDataProperty(A, new Value('0'), S));
    return A;
  }

  let q = p;
  while (q < size) {
    Q(Set(splitter, new Value('lastIndex'), F(q), Value.true));
    const z = Q(RegExpExec(splitter, S));
    if (z === Value.null) {
      q = AdvanceStringIndex(S, q, unicodeMatching);
    } else {
      const lastIndex = Q(Get(splitter, new Value('lastIndex')));
      let e = Q(ToLength(lastIndex)).numberValue();
      e = Math.min(e, size);
      if (e === p) {
        q = AdvanceStringIndex(S, q, unicodeMatching);
      } else {
        const T = new Value(S.stringValue().substring(p, q));
        X(CreateDataProperty(A, X(ToString(F(lengthA))), T));
        lengthA += 1;
        if (lengthA === lim) {
          return A;
        }
        p = e;
        let numberOfCaptures = Q(LengthOfArrayLike(z));
        numberOfCaptures = Math.max(numberOfCaptures - 1, 0);
        let i = 1;
        while (i <= numberOfCaptures) {
          const nextCapture = Q(Get(z, X(ToString(F(i)))));
          X(CreateDataProperty(A, X(ToString(F(lengthA))), nextCapture));
          i += 1;
          lengthA += 1;
          if (lengthA === lim) {
            return A;
          }
        }
        q = p;
      }
    }
  }

  const T = new Value(S.stringValue().substring(p, size));
  X(CreateDataProperty(A, X(ToString(F(lengthA))), T));
  return A;
}

/** http://tc39.es/ecma262/#sec-get-regexp.prototype.sticky */
function RegExpProto_stickyGetter(args, { thisValue }) {
  // 1. Let R be the this value.
  const R = thisValue;
  // 2. Let cu be the code unit 0x0097 (LATIN SMALL LETTER Y).
  const cu = 'y';
  // 3. Return ? RegExpHasFlag(R, cu).
  return Q(RegExpHasFlag(R, cu));
}

/** http://tc39.es/ecma262/#sec-regexp.prototype.test */
function RegExpProto_test([S = Value.undefined], { thisValue }) {
  const R = thisValue;
  if (!(R instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const string = Q(ToString(S));
  const match = Q(RegExpExec(R, string));
  if (match !== Value.null) {
    return Value.true;
  }
  return Value.false;
}

/** http://tc39.es/ecma262/#sec-regexp.prototype.tostring */
function RegExpProto_toString(args, { thisValue }) {
  const R = thisValue;
  if (!(R instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const pattern = Q(ToString(Q(Get(R, new Value('source')))));
  const flags = Q(ToString(Q(Get(R, new Value('flags')))));
  const result = `/${pattern.stringValue()}/${flags.stringValue()}`;
  return new Value(result);
}

/** http://tc39.es/ecma262/#sec-get-regexp.prototype.unicode */
function RegExpProto_unicodeGetter(args, { thisValue }) {
  // 1. Let R be the this value.
  const R = thisValue;
  // 2. Let cu be the code unit 0x0075 (LATIN SMALL LETTER U).
  const cu = 'u';
  // 3. Return ? RegExpHasFlag(R, cu).
  return Q(RegExpHasFlag(R, cu));
}

export function bootstrapRegExpPrototype(realmRec) {
  const proto = bootstrapPrototype(
    realmRec,
    [
      ['exec', RegExpProto_exec, 1],
      ['dotAll', [RegExpProto_dotAllGetter]],
      ['flags', [RegExpProto_flagsGetter]],
      ['global', [RegExpProto_globalGetter]],
      ['hasIndices', [RegExpProto_hasIndicesGetter]],
      ['ignoreCase', [RegExpProto_ignoreCaseGetter]],
      [wellKnownSymbols.match, RegExpProto_match, 1],
      [wellKnownSymbols.matchAll, RegExpProto_matchAll, 1],
      ['multiline', [RegExpProto_multilineGetter]],
      [wellKnownSymbols.replace, RegExpProto_replace, 2],
      [wellKnownSymbols.search, RegExpProto_search, 1],
      ['source', [RegExpProto_sourceGetter]],
      [wellKnownSymbols.split, RegExpProto_split, 2],
      ['sticky', [RegExpProto_stickyGetter]],
      ['test', RegExpProto_test, 1],
      ['toString', RegExpProto_toString, 0],
      ['unicode', [RegExpProto_unicodeGetter]],
    ],
    realmRec.Intrinsics['%Object.prototype%'],
  );

  realmRec.Intrinsics['%RegExp.prototype%'] = proto;
}
