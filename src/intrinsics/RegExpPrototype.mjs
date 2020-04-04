import { surroundingAgent } from '../engine.mjs';
import {
  ArrayCreate,
  Assert,
  Call,
  CodePointAt,
  Construct,
  CreateDataProperty,
  EscapeRegExpPattern,
  Get,
  IsCallable,
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
import {
  GetSubstitution,
  State,
} from '../runtime-semantics/all.mjs';
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
  Assert('RegExpMatcher' in R);
  Assert(Type(S) === 'String');
  const length = S.stringValue().length;
  let lastIndex = Q(ToLength(Q(Get(R, new Value('lastIndex')))));
  const flags = R.OriginalFlags.stringValue();
  const global = flags.includes('g');
  const sticky = flags.includes('y');
  if (!global && !sticky) {
    lastIndex = new Value(0);
  }
  const matcher = R.RegExpMatcher;
  const fullUnicode = flags.includes('u');
  let matchSucceeded = false;
  let r;
  while (matchSucceeded === false) {
    if (lastIndex.numberValue() > length) {
      if (global || sticky) {
        Q(Set(R, new Value('lastIndex'), new Value(0), Value.true));
      }
      return Value.null;
    }
    r = matcher(S, lastIndex);
    if (r === 'failure') {
      if (sticky) {
        Q(Set(R, new Value('lastIndex'), new Value(0), Value.true));
        return Value.null;
      }
      lastIndex = AdvanceStringIndex(S, lastIndex, fullUnicode ? Value.true : Value.false);
    } else {
      Assert(r instanceof State);
      matchSucceeded = true;
    }
  }

  let e = r.endIndex;
  if (fullUnicode) {
    const Input = Array.from(S.stringValue());
    let eUTF = 0;
    if (e >= Input.length) {
      eUTF = S.stringValue().length;
    } else {
      for (let i = 0; i < e; i += 1) {
        eUTF += Input[i].length;
      }
    }
    e = eUTF;
  }

  if (global || sticky) {
    Q(Set(R, new Value('lastIndex'), new Value(e), Value.true));
  }

  const n = r.captures.length - 1;
  Assert(n < (2 ** 32) - 1);
  const A = X(ArrayCreate(new Value(n + 1)));
  // Assert: The value of A's "length" property is n + 1.
  X(CreateDataProperty(A, new Value('index'), lastIndex));
  X(CreateDataProperty(A, new Value('input'), S));
  const matchedSubstr = S.stringValue().substring(lastIndex.numberValue(), e);
  X(CreateDataProperty(A, new Value('0'), new Value(matchedSubstr)));

  let groups;
  if (R.parsedRegExp.groupSpecifiers.size > 0) {
    groups = OrdinaryObjectCreate(Value.null);
  } else {
    groups = Value.undefined;
  }
  X(CreateDataProperty(A, new Value('groups'), groups));

  const capturingParens = R.parsedRegExp.capturingParens;
  for (let i = 1; i <= n; i += 1) {
    const captureI = r.captures[i];
    let capturedValue;
    if (captureI === Value.undefined) {
      capturedValue = Value.undefined;
    } else if (fullUnicode) {
      // Assert: captureI is a List of code points.
      capturedValue = new Value(captureI.join(''));
    } else {
      // Assert: captureI is a List of code units.
      capturedValue = new Value(captureI.join(''));
    }
    X(CreateDataProperty(A, X(ToString(new Value(i))), capturedValue));
    if (capturingParens[i - 1].GroupSpecifier) {
      const s = new Value(capturingParens[i - 1].GroupSpecifier);
      X(CreateDataProperty(groups, s, capturedValue));
    }
  }

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
