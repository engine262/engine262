import { surroundingAgent } from '../engine.mjs';
import {
  ArrayCreate,
  Assert,
  Call,
  CodePointAt,
  Construct,
  CreateArrayFromList,
  CreateDataProperty,
  EscapeRegExpPattern,
  Get,
  IsCallable,
  // MatchRecord,
  OrdinaryObjectCreate,
  SameValue,
  Set,
  SpeciesConstructor,
  LengthOfArrayLike,
  ToBoolean,
  ToInteger,
  ToLength,
  ToString,
  ToObject,
  ToUint32,
  RequireInternalSlot,
} from '../abstract-ops/all.mjs';
// import { GetSubstitution } from '../runtime-semantics/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { CreateRegExpStringIterator } from './RegExpStringIteratorPrototype.mjs';


// 21.2.5.2 #sec-regexp.prototype.exec
function RegExpProto_exec([string = Value.undefined], { thisValue }) {
  const R = thisValue;
  Q(RequireInternalSlot(R, 'RegExpMatcher'));
  const S = Q(ToString(string));
  return Q(RegExpBuiltinExec(R, S));
}

// 21.2.5.2.1 #sec-regexpexec
export function RegExpExec(R, S) {
  Assert(Type(R) === 'Object');
  Assert(Type(S) === 'String');

  const exec = Q(Get(R, new Value('exec')));
  if (IsCallable(exec) === Value.true) {
    const result = Q(Call(exec, R, [S]));
    if (Type(result) !== 'Object' && Type(result) !== 'Null') {
      return surroundingAgent.Throw('TypeError', 'RegExpExecNotObject', result);
    }
    return result;
  }
  Q(RequireInternalSlot(R, 'RegExpMatcher'));
  return Q(RegExpBuiltinExec(R, S));
}

// 21.2.5.2.2 #sec-regexpbuiltinexec
function RegExpBuiltinExec(R, S) {
  // 1. Assert: R is an initialized RegExp instance.
  Assert('RegExpMatcher' in R);
  // 2. Assert: Type(S) is String.
  Assert(Type(S) === 'String');
  // 3. Let length be the number of code units in S.
  const length = S.stringValue().length;
  // 4. Let lastIndex be ? ToLength(? Get(R, "lastIndex")).
  let lastIndex = Q(ToLength(Q(Get(R, new Value('lastIndex')))));
  // 5. Let flags be R.[[OriginalFlags]].
  const flags = R.OriginalFlags.stringValue();
  // 6. If flags contains "g", let global be true; else let global be false.
  const global = flags.includes('g');
  // 7. If flags contains "y", let sticky be true; else let sticky be false.
  const sticky = flags.includes('y');
  // 8. If global is false and sticky is false, set lastIndex to 0.
  if (!global && !sticky) {
    lastIndex = new Value(0);
  }
  // 9. Let matcher be R.[[RegExpMatcher]].
  const matcher = R.RegExpMatcher;
  // 10. If flags contains "u", let fullUnicode be true; else let fullUnicode be false.
  const fullUnicode = flags.includes('u');
  // 11. Let matchSucceeded be false.
  let matchSucceeded = false;
  let r;
  // 12. Repeat, while matchSucceeded is false
  while (matchSucceeded === false) {
    // a. If lastIndex > length, then
    if (lastIndex.numberValue() > length) {
      // i. If global is true or sticky is true, then
      if (global || sticky) {
        // 1. Perform ? Set(R, "lastIndex", 0, true).
        Q(Set(R, new Value('lastIndex'), new Value(0), Value.true));
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
        // 1. Perform ? Set(R, "lastIndex", 0, true).
        Q(Set(R, new Value('lastIndex'), new Value(0), Value.true));
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
  // 13. Let e be r's endIndex value.
  let e = r.endIndex;
  const Input = fullUnicode ? Array.from(S.stringValue()) : S.stringValue().split('');
  // 14. If fullUnicode is true, then
  if (fullUnicode) {
    // https://tc39.es/proposal-regexp-match-indices/#sec-regexpbuiltinexec
    if (surroundingAgent.feature('RegExpMatchIndices')) {
      // If fullUnicode is true, set e to ! GetStringIndex(S, Input, e).
      e = X(GetStringIndex(S, Input, e));
    } else {
      // a. e is an index into the Input character list, derived from S, matched by matcher.
      //    Let eUTF be the smallest index into S that corresponds to the character at element e of Input.
      //    If e is greater than or equal to the number of elements in Input, then eUTF is the number of code units in S.
      let eUTF = 0;
      if (e >= Input.length) {
        eUTF = S.stringValue().length;
      } else {
        for (let i = 0; i < e; i += 1) {
          eUTF += Input[i].length;
        }
      }
      // b. Set e to eUTF.
      e = eUTF;
    }
  }
  // 15. If global is true or sticky is true, then
  if (global || sticky) {
    // a. Perform ? Set(R, "lastIndex", e, true).
    Q(Set(R, new Value('lastIndex'), new Value(e), Value.true));
  }
  // 16. Let n be the number of elements in r's captures List.
  const n = r.captures.length - 1;
  // 17. Assert: n < 2^32 - 1.
  Assert(n < (2 ** 32) - 1);
  // 18. Let A be ! ArrayCreate(n + 1).
  const A = X(ArrayCreate(new Value(n + 1)));
  // 19. Assert: The value of A's "length" property is n + 1.
  Assert(X(Get(A, new Value('length'))).numberValue() === n + 1);
  // 20. Perform ! CreateDataPropertyOrThrow(A, "index", lastIndex).
  X(CreateDataProperty(A, new Value('index'), lastIndex));
  // 21. Perform ! CreateDataPropertyOrThrow(A, "input", S).
  X(CreateDataProperty(A, new Value('input'), S));
  const capturingParens = R.parsedRegExp.capturingParens;
  // https://tc39.es/proposal-regexp-match-indices/#sec-regexpbuiltinexec
  if (surroundingAgent.feature('RegExpMatchIndices')) {
    // Let indices be a new empty List.
    const indices = [];
    // Let match be the Match { [[StartIndex]]: lastIndex, [[EndIndex]]: e }.
    const match = new MatchRecord(lastIndex.numberValue(), e);
    // Add match as the last element of indices.
    indices.push(match);
    // Let matchedValue be ! GetMatchString(S, match).
    const matchedValue = X(GetMatchString(S, match));
    // Perform ! CreateDataProperty(A, "0", matchedValue).
    X(CreateDataProperty(A, new Value('0'), matchedValue));
    let groups;
    let groupNames;
    // If R contains any GroupName, then
    if (R.parsedRegExp.groupSpecifiers.size > 0) {
      // Let groups be OrdinaryObjectCreate(null).
      groups = OrdinaryObjectCreate(Value.null);
      // Let groupNames be a new empty List.
      groupNames = [];
      // TODO: add this to spec text.
      groupNames.push(Value.undefined);
    } else { // Else,
      // Let groups be undefined.
      groups = Value.undefined;
      // Let groupNames be undefined.
      groupNames = Value.undefined;
    }
    // Perform ! CreateDataPropertyOrThrow(A, "groups", groups).
    X(CreateDataProperty(A, new Value('groups'), groups));
    // For each integer i such that i > 0 and i ≤ n, do
    for (let i = 1; i <= n; i += 1) {
      // Let captureI be ith element of r's captures List.
      const captureI = r.captures[i];
      let capturedValue;
      // If captureI is undefined, then
      if (captureI === Value.undefined) {
        // Let capturedValue be undefined.
        capturedValue = Value.undefined;
        // Add undefined as the last element of indices.
        indices.push(Value.undefined);
      } else { // Else,
        // Let captureStart be captureI's startIndex.
        let captureStart = captureI.startIndex;
        // Let captureEnd be captureI's endIndex.
        let captureEnd = captureI.endIndex;
        // If fullUnicode is true, then
        if (fullUnicode) {
          // Set captureStart to ! GetStringIndex(S, Input, captureStart).
          captureStart = X(GetStringIndex(S, Input, captureStart));
          // Set captureEnd to ! GetStringIndex(S, Input, captureEnd).
          captureEnd = X(GetStringIndex(S, Input, captureEnd));
        }
        // Let capture be the Match { [[StartIndex]]: captureStart, [[EndIndex]:: captureEnd }.
        const capture = new MatchRecord(captureStart, captureEnd);
        // Append capture to indices.
        indices.push(capture);
        // Let capturedValue be ! GetMatchString(S, capture).
        capturedValue = X(GetMatchString(S, capture));
      }
      // Perform ! CreateDataPropertyOrThrow(A, ! ToString(i), capturedValue).
      X(CreateDataProperty(A, X(ToString(new Value(i))), capturedValue));
      // If the ith capture of R was defined with a GroupName, then
      if (capturingParens[i - 1].GroupSpecifier) {
        // Let s be the StringValue of the corresponding RegExpIdentifierName.
        const s = new Value(capturingParens[i - 1].GroupSpecifier);
        // Perform ! CreateDataPropertyOrThrow(groups, s, capturedValue).
        X(CreateDataProperty(groups, s, capturedValue));
        // Assert: groupNames is a List.
        Assert(Array.isArray(groupNames));
        // Append s to groupNames.
        groupNames.push(s);
      } else { // Else,
        // If groupNames is a List, append undefined to groupNames.
        if (Array.isArray(groupNames)) {
          groupNames.push(Value.undefined);
        }
      }
    }
    // Let indicesArray be MakeIndicesArray(S, indices, groupNames).
    const indicesArray = MakeIndicesArray(S, indices, groupNames);
    // Perform ! CreateDataProperty(A, "indices", indicesArray).
    X(CreateDataProperty(A, new Value('indices'), indicesArray));
  } else {
    // 22. Let matchedSubstr be the matched substring (i.e. the portion of S between offset lastIndex inclusive and offset e exclusive).
    const matchedSubstr = S.stringValue().substring(lastIndex.numberValue(), e);
    // 23. Perform ! CreateDataPropertyOrThrow(A, "0", matchedSubstr).
    X(CreateDataProperty(A, new Value('0'), new Value(matchedSubstr)));
    let groups;
    // 24. If R contains any GroupName, then
    if (R.parsedRegExp.groupSpecifiers.size > 0) {
      // a. Let groups be OrdinaryObjectCreate(null).
      groups = OrdinaryObjectCreate(Value.null);
    } else { // 25. Else,
      // a. Let groups be undefined.
      groups = Value.undefined;
    }
    // 26. Perform ! CreateDataPropertyOrThrow(A, "groups", groups).
    X(CreateDataProperty(A, new Value('groups'), groups));
    // 27. For each integer i such that i > 0 and i ≤ n, do
    for (let i = 1; i <= n; i += 1) {
      // a. Let captureI be ith element of r's captures List.
      const captureI = r.captures[i];
      let capturedValue;
      // b. If captureI is undefined, let capturedValue be undefined.
      if (captureI === Value.undefined) {
        capturedValue = Value.undefined;
      } else if (fullUnicode) { // c. Else if fullUnicode is true, then
        // i. Assert: captureI is a List of code points.
        // ii. Let capturedValue be ! UTF16Encode(captureI).
        capturedValue = new Value(captureI.join(''));
      } else { // d. Else,
        // i. Assert: fullUnicode is false.
        Assert(fullUnicode === false);
        // ii. Assert: captureI is a List of code units.
        // iii. Let capturedValue be the String value consisting of the code units of captureI.
        capturedValue = new Value(captureI.join(''));
      }
      // e. Perform ! CreateDataPropertyOrThrow(A, ! ToString(i), capturedValue).
      X(CreateDataProperty(A, X(ToString(new Value(i))), capturedValue));
      // f. If the ith capture of R was defined with a GroupName, then
      if (capturingParens[i - 1].GroupSpecifier) {
        // i. Let s be the StringValue of the corresponding RegExpIdentifierName.
        const s = new Value(capturingParens[i - 1].GroupSpecifier);
        // ii. Perform ! CreateDataPropertyOrThrow(groups, s, capturedValue).
        X(CreateDataProperty(groups, s, capturedValue));
      }
    }
  }
  // 28. Return A.
  return A;
}

// 21.2.5.2.3 #sec-advancestringindex
export function AdvanceStringIndex(S, index, unicode) {
  Assert(Type(S) === 'String');
  index = index.numberValue();
  Assert(Number.isInteger(index) && index >= 0 && index <= (2 ** 53) - 1);
  Assert(Type(unicode) === 'Boolean');

  if (unicode === Value.false) {
    return new Value(index + 1);
  }

  const length = S.stringValue().length;
  if (index + 1 >= length) {
    return new Value(index + 1);
  }

  const cp = X(CodePointAt(S, index));
  return new Value(index + cp.CodeUnitCount.numberValue());
}

// https://tc39.es/proposal-regexp-match-indices/#sec-getstringindex
function GetStringIndex(S, Input, e) {
  // 1. Assert: Type(S) is String.
  Assert(Type(S) === 'String');
  // 2. Assert: Input is a List of the code points of S interpreted as a UTF-16 encoded string.
  Assert(Array.isArray(Input));
  // 3. Assert: e is an integer value ≥ 0 and < the number of elements in Input.
  // TODO: fix spec text.
  Assert(e >= 0/* && e < Input.length */);
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
function GetMatchString(S, match) {
  // 1. Assert: Type(S) is String.
  Assert(Type(S) === 'String');
  // 2. Assert: match is a Match Record.
  Assert(match instanceof MatchRecord);
  // 3. Assert: match.[[StartIndex]] is an integer value ≥ 0 and < the length of S.
  // TODO: fix spec text.
  Assert(Number.isInteger(match.StartIndex) && match.StartIndex >= 0 && match.StartIndex <= S.stringValue().length);
  // 4. Assert: match.[[EndIndex]] is an integer value ≥ match.[[StartIndex]] and ≤ the length of S.
  Assert(Number.isInteger(match.EndIndex) && match.EndIndex >= match.StartIndex && match.EndIndex <= S.stringValue().length);
  // 5. Return the portion of S between offset match.[[StartIndex]] inclusive and offset match.[[EndIndex]] exclusive.
  return new Value(S.stringValue().slice(match.StartIndex, match.EndIndex));
}

// https://tc39.es/proposal-regexp-match-indices/#sec-getmatchindicesarray
function GetMatchIndicesArray(S, match) {
  // 1. Assert: Type(S) is String.
  Assert(Type(S) === 'String');
  // 2. Assert: match is a Match Record.
  Assert(match instanceof MatchRecord);
  // 3. Assert: match.[[StartIndex]] is an integer value ≥ 0 and < the length of S.
  // TODO: fix spect text.
  Assert(Number.isInteger(match.StartIndex) && match.StartIndex >= 0 && match.StartIndex <= S.stringValue().length);
  // 4. Assert: match.[[EndIndex]] is an integer value ≥ match.[[StartIndex]] and ≤ the length of S.
  Assert(Number.isInteger(match.EndIndex) && match.EndIndex >= match.StartIndex && match.EndIndex <= S.stringValue().length);
  // 5. Return CreateArrayFromList(« match.[[StartIndex]], match.[[EndIndex]] »).
  return CreateArrayFromList([new Value(match.StartIndex), new Value(match.EndIndex)]);
}

// https://tc39.es/proposal-regexp-match-indices/#sec-makeindicesarray
function MakeIndicesArray(S, indices, groupNames) {
  // 1. Assert: Type(S) is String.
  Assert(Type(S) === 'String');
  // 2. Assert: indices is a List.
  Assert(Array.isArray(indices));
  // 3. Assert: groupNames is a List or is undefined.
  Assert(Array.isArray(groupNames) || groupNames === Value.undefined);
  // 4. Let n be the number of elements in indices.
  const n = indices.length;
  // 5. Assert: n < 2^32-1.
  Assert(n < 2 ** 32 - 1);
  // 6. Set A to ! ArrayCreate(n).
  const A = X(ArrayCreate(new Value(n)));
  // 7. Assert: The value of A's "length" property is n.
  Assert(X(Get(A, new Value('length'))).numberValue() === n);
  let groups;
  // 8. If groupNames is not undefined, then
  if (groupNames !== Value.undefined) {
    // a. Let groups be ! ObjectCreate(null).
    groups = X(OrdinaryObjectCreate(Value.null));
  } else { // 9. Else,
    // b. Let groups be undefined.
    groups = Value.undefined;
  }
  // 10. Perform ! CreateDataProperty(A, "groups", groups).
  X(CreateDataProperty(A, new Value('groups'), groups));
  // 11. For each integer i such that i ≥ 0 and i < n, do
  for (let i = 0; i < n; i += 1) {
    // a. Let matchIndices be indices[i].
    const matchIndices = indices[i];
    let matchIndicesArray;
    // b. If matchIndices is not undefined, then
    if (matchIndices !== Value.undefined) {
      // i. Let matchIndicesArray be ! GetMatchIndicesArray(S, matchIndices).
      matchIndicesArray = X(GetMatchIndicesArray(S, matchIndices));
    } else { // c. Else,
      // i. Let matchIndicesArray be undefined.
      matchIndicesArray = Value.undefined;
    }
    // d. Perform ! CreateDataProperty(A, ! ToString(i), matchIndicesArray).
    X(CreateDataProperty(A, X(ToString(new Value(i))), matchIndicesArray));
    // e. If groupNames is not undefined and groupNames[i] is not undefined, then
    if (groupNames !== Value.undefined && groupNames[i] !== Value.undefined) {
      // i. Perform ! CreateDataProperty(groups, groupNames[i], matchIndicesArray).
      X(CreateDataProperty(groups, groupNames[i], matchIndicesArray));
    }
  }
  // 12. Return A.
  return A;
}

// 21.2.5.3 #sec-get-regexp.prototype.dotAll
function RegExpProto_dotAllGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExp.prototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const flags = R.OriginalFlags;
  if (flags.stringValue().includes('s')) {
    return Value.true;
  }
  return Value.false;
}

// 21.2.5.4 #sec-get-regexp.prototype.flags
function RegExpProto_flagsGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  let result = '';
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

// 21.2.5.5 #sec-get-regexp.prototype.global
function RegExpProto_globalGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
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

// 21.2.5.6 #sec-get-regexp.prototype.ignorecase
function RegExpProto_ignoreCaseGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExp.prototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const flags = R.OriginalFlags;
  if (flags.stringValue().includes('i')) {
    return Value.true;
  }
  return Value.false;
}

// 21.2.5.7 #sec-regexp.prototype-@@match
function RegExpProto_match([string = Value.undefined], { thisValue }) {
  const rx = thisValue;
  if (Type(rx) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', rx);
  }
  const S = Q(ToString(string));

  const global = ToBoolean(Q(Get(rx, new Value('global'))));
  if (global === Value.false) {
    return Q(RegExpExec(rx, S));
  } else {
    const fullUnicode = ToBoolean(Q(Get(rx, new Value('unicode'))));
    Q(Set(rx, new Value('lastIndex'), new Value(0), Value.true));
    const A = X(ArrayCreate(new Value(0)));
    let n = 0;
    while (true) {
      const result = Q(RegExpExec(rx, S));
      if (result === Value.null) {
        if (n === 0) {
          return Value.null;
        }
        return A;
      } else {
        const matchStr = Q(ToString(Q(Get(result, new Value('0')))));
        const status = CreateDataProperty(A, X(ToString(new Value(n))), matchStr);
        Assert(status === Value.true);
        if (matchStr.stringValue() === '') {
          const thisIndex = Q(ToLength(Q(Get(rx, new Value('lastIndex')))));
          const nextIndex = AdvanceStringIndex(S, thisIndex, fullUnicode);
          Q(Set(rx, new Value('lastIndex'), nextIndex, Value.true));
        }
        n += 1;
      }
    }
  }
}

// 21.2.5.8 #sec-regexp-prototype-matchall
function RegExpProto_matchAll([string = Value.undefined], { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
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

// 21.2.5.9 #sec-get-regexp.prototype.multiline
function RegExpProto_multilineGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExp.prototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const flags = R.OriginalFlags;
  if (flags.stringValue().includes('m')) {
    return Value.true;
  }
  return Value.false;
}

// 21.2.5.10 #sec-regexp.prototype-@@replace
function RegExpProto_replace([string = Value.undefined, replaceValue = Value.undefined], { thisValue }) {
  const rx = thisValue;
  if (Type(rx) !== 'Object') {
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
    Q(Set(rx, new Value('lastIndex'), new Value(0), Value.true));
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
          const thisIndex = Q(ToLength(Q(Get(rx, new Value('lastIndex')))));
          const nextIndex = AdvanceStringIndex(S, thisIndex, fullUnicode);
          Q(Set(rx, new Value('lastIndex'), nextIndex, Value.true));
        }
      }
    }
  }

  let accumulatedResult = '';
  let nextSourcePosition = 0;
  for (const result of results) {
    let nCaptures = Q(LengthOfArrayLike(result)).numberValue();
    nCaptures = Math.max(nCaptures - 1, 0);

    const matched = Q(ToString(Q(Get(result, new Value('0')))));
    const matchLength = matched.stringValue().length;

    let position = Q(ToInteger(Q(Get(result, new Value('index')))));
    position = new Value(Math.max(Math.min(position.numberValue(), lengthS), 0));

    let n = 1;
    const captures = [];
    while (n <= nCaptures) {
      let capN = Q(Get(result, X(ToString(new Value(n)))));
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
      replacerArgs.push(position, S);
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

    if (position.numberValue() >= nextSourcePosition) {
      accumulatedResult = accumulatedResult + S.stringValue().substring(nextSourcePosition, position.numberValue()) + replacement.stringValue();
      nextSourcePosition = position.numberValue() + matchLength;
    }
  }

  if (nextSourcePosition >= lengthS) {
    return new Value(accumulatedResult);
  }

  return new Value(accumulatedResult + S.stringValue().substring(nextSourcePosition));
}

// 21.2.5.11 #sec-regexp.prototype-@@search
function RegExpProto_search([string = Value.undefined], { thisValue }) {
  const rx = thisValue;
  if (Type(rx) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', rx);
  }
  const S = Q(ToString(string));

  const previousLastIndex = Q(Get(rx, new Value('lastIndex')));
  if (SameValue(previousLastIndex, new Value(0)) === Value.false) {
    Q(Set(rx, new Value('lastIndex'), new Value(0), Value.true));
  }

  const result = Q(RegExpExec(rx, S));
  const currentLastIndex = Q(Get(rx, new Value('lastIndex')));
  if (SameValue(currentLastIndex, previousLastIndex) === Value.false) {
    Q(Set(rx, new Value('lastIndex'), previousLastIndex, Value.true));
  }

  if (result === Value.null) {
    return new Value(-1);
  }

  return Q(Get(result, new Value('index')));
}

// 21.2.5.12 #sec-get-regexp.prototype.source
function RegExpProto_sourceGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
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

// 21.2.5.13 #sec-regexp.prototype-@@split
function RegExpProto_split([string = Value.undefined, limit = Value.undefined], { thisValue }) {
  const rx = thisValue;
  if (Type(rx) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', rx);
  }
  const S = Q(ToString(string));

  const C = Q(SpeciesConstructor(rx, surroundingAgent.intrinsic('%RegExp%')));
  const flagsValue = Q(Get(rx, new Value('flags')));
  const flags = Q(ToString(flagsValue)).stringValue();
  const unicodeMatching = flags.includes('u') ? Value.true : Value.false;
  const newFlags = flags.includes('y') ? new Value(flags) : new Value(`${flags}y`);
  const splitter = Q(Construct(C, [rx, newFlags]));

  const A = X(ArrayCreate(new Value(0)));
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

  let q = new Value(p);
  while (q.numberValue() < size) {
    Q(Set(splitter, new Value('lastIndex'), q, Value.true));
    const z = Q(RegExpExec(splitter, S));
    if (z === Value.null) {
      q = AdvanceStringIndex(S, q, unicodeMatching);
    } else {
      const lastIndex = Q(Get(splitter, new Value('lastIndex')));
      let e = Q(ToLength(lastIndex));
      e = new Value(Math.min(e.numberValue(), size));
      if (e.numberValue() === p) {
        q = AdvanceStringIndex(S, q, unicodeMatching);
      } else {
        const T = new Value(S.stringValue().substring(p, q.numberValue()));
        X(CreateDataProperty(A, X(ToString(new Value(lengthA))), T));
        lengthA += 1;
        if (lengthA === lim) {
          return A;
        }
        p = e.numberValue();
        let numberOfCaptures = Q(LengthOfArrayLike(z)).numberValue();
        numberOfCaptures = Math.max(numberOfCaptures - 1, 0);
        let i = 1;
        while (i <= numberOfCaptures) {
          const nextCapture = Q(Get(z, X(ToString(new Value(i)))));
          X(CreateDataProperty(A, X(ToString(new Value(lengthA))), nextCapture));
          i += 1;
          lengthA += 1;
          if (lengthA === lim) {
            return A;
          }
        }
        q = new Value(p);
      }
    }
  }

  const T = new Value(S.stringValue().substring(p, size));
  X(CreateDataProperty(A, X(ToString(new Value(lengthA))), T));
  return A;
}

// 21.2.5.14 #sec-get-regexp.prototype.sticky
function RegExpProto_stickyGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExp.prototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const flags = R.OriginalFlags;
  if (flags.stringValue().includes('y')) {
    return Value.true;
  }
  return Value.false;
}

// 21.2.5.15 #sec-regexp.prototype.test
function RegExpProto_test([S = Value.undefined], { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const string = Q(ToString(S));
  const match = Q(RegExpExec(R, string));
  if (match !== Value.null) {
    return Value.true;
  }
  return Value.false;
}

// 21.2.5.16 #sec-regexp.prototype.tostring
function RegExpProto_toString(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const pattern = Q(ToString(Q(Get(R, new Value('source')))));
  const flags = Q(ToString(Q(Get(R, new Value('flags')))));
  const result = `/${pattern.stringValue()}/${flags.stringValue()}`;
  return new Value(result);
}

// 21.2.5.17 #sec-get-regexp.prototype.unicode
function RegExpProto_unicodeGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExp.prototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'RegExp', R);
  }
  const flags = R.OriginalFlags;
  if (flags.stringValue().includes('u')) {
    return Value.true;
  }
  return Value.false;
}

export function BootstrapRegExpPrototype(realmRec) {
  const proto = BootstrapPrototype(
    realmRec,
    [
      ['exec', RegExpProto_exec, 1],
      ['dotAll', [RegExpProto_dotAllGetter]],
      ['flags', [RegExpProto_flagsGetter]],
      ['global', [RegExpProto_globalGetter]],
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
