// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  ObjectValue,
  JSStringValue,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  ArrayCreate,
  Assert,
  Call,
  CreateDataPropertyOrThrow,
  CreateIteratorFromClosure,
  Get,
  GetMethod,
  Invoke,
  IsCallable,
  IsRegExp,
  RegExpCreate,
  RequireObjectCoercible,
  ToIntegerOrInfinity,
  ToNumber,
  ToString,
  ToUint32,
  StringCreate,
  Yield,
  F,
} from '../abstract-ops/all.mjs';
import {
  GetSubstitution,
  TrimString,
  StringPad,
  StringIndexOf,
} from '../runtime-semantics/all.mjs';
import {
  CodePointAt,
  IsStringWellFormedUnicode,
  UTF16EncodeCodePoint,
} from '../static-semantics/all.mjs';
import { Q, X } from '../completion.mjs';
import { assignProps } from './bootstrap.mjs';


function thisStringValue(value) {
  if (value instanceof JSStringValue) {
    return value;
  }
  if (value instanceof ObjectValue && 'StringData' in value) {
    const s = value.StringData;
    Assert(s instanceof JSStringValue);
    return s;
  }
  return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'String', value);
}

/** http://tc39.es/ecma262/#sec-string.prototype.charat */
function StringProto_charAt([pos = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const position = Q(ToIntegerOrInfinity(pos));
  const size = S.stringValue().length;
  if (position < 0 || position >= size) {
    return new Value('');
  }
  return new Value(S.stringValue()[position]);
}

/** http://tc39.es/ecma262/#sec-string.prototype.charcodeat */
function StringProto_charCodeAt([pos = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const position = Q(ToIntegerOrInfinity(pos));
  const size = S.stringValue().length;
  if (position < 0 || position >= size) {
    return F(NaN);
  }
  return F(S.stringValue().charCodeAt(position));
}

/** http://tc39.es/ecma262/#sec-string.prototype.codepointat */
function StringProto_codePointAt([pos = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const position = Q(ToIntegerOrInfinity(pos));
  const size = S.stringValue().length;
  if (position < 0 || position >= size) {
    return Value.undefined;
  }
  const cp = X(CodePointAt(S.stringValue(), position));
  return F(cp.CodePoint);
}

/** http://tc39.es/ecma262/#sec-string.prototype.concat */
function StringProto_concat(args, { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  let R = S.stringValue();
  while (args.length > 0) {
    const next = args.shift();
    const nextString = Q(ToString(next));
    R = `${R}${nextString.stringValue()}`;
  }
  return new Value(R);
}

/** http://tc39.es/ecma262/#sec-string.prototype.endswith */
function StringProto_endsWith([searchString = Value.undefined, endPosition = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O)).stringValue();
  const isRegExp = Q(IsRegExp(searchString));
  if (isRegExp === Value.true) {
    return surroundingAgent.Throw('TypeError', 'RegExpArgumentNotAllowed', 'String.prototype.endsWith');
  }
  const searchStr = Q(ToString(searchString)).stringValue();
  const len = S.length;
  let pos;
  if (endPosition === Value.undefined) {
    pos = len;
  } else {
    pos = Q(ToIntegerOrInfinity(endPosition));
  }
  const end = Math.min(Math.max(pos, 0), len);
  const searchLength = searchStr.length;
  const start = end - searchLength;
  if (start < 0) {
    return Value.false;
  }
  for (let i = 0; i < searchLength; i += 1) {
    if (S.charCodeAt(start + i) !== searchStr.charCodeAt(i)) {
      return Value.false;
    }
  }
  return Value.true;
}

/** http://tc39.es/ecma262/#sec-string.prototype.includes */
function StringProto_includes([searchString = Value.undefined, position = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O)).stringValue();
  const isRegExp = Q(IsRegExp(searchString));
  if (isRegExp === Value.true) {
    return surroundingAgent.Throw('TypeError', 'RegExpArgumentNotAllowed', 'String.prototype.includes');
  }
  const searchStr = Q(ToString(searchString)).stringValue();
  const pos = Q(ToIntegerOrInfinity(position));
  Assert(!(position === Value.undefined) || pos === 0);
  const len = S.length;
  const start = Math.min(Math.max(pos, 0), len);
  const searchLen = searchStr.length;
  let k = start;
  while (k + searchLen <= len) {
    let match = true;
    for (let j = 0; j < searchLen; j += 1) {
      if (searchStr[j] !== S[k + j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return Value.true;
    }
    k += 1;
  }
  return Value.false;
}

/** http://tc39.es/ecma262/#sec-string.prototype.indexof */
function StringProto_indexOf([searchString = Value.undefined, position = Value.undefined], { thisValue }) {
  // 1. Let O be ? RequireObjectCoercible(this value).
  const O = Q(RequireObjectCoercible(thisValue));
  // 2. Let S be ? ToString(O).
  const S = Q(ToString(O));
  // 3. Let searchStr be ? ToString(searchString).
  const searchStr = Q(ToString(searchString));
  // 4. Let pos be ? ToIntegerOrInfinity(position).
  const pos = Q(ToIntegerOrInfinity(position));
  // 5. Assert: If position is undefined, then pos is 0.
  Assert(!(position === Value.undefined) || pos === 0);
  // 6. Let len be the length of S.
  const len = S.stringValue().length;
  // 7. Let start be min(max(pos, 0), len).
  const start = Math.min(Math.max(pos, 0), len);
  // 8. Return ! StringIndexOf(S, searchStr, start).
  return X(StringIndexOf(S, searchStr, start));
}

/** https://tc39.es/proposal-is-usv-string/#sec-string.prototype.iswellformed */
function StringProto_isWellFormed(args, { thisValue }) {
  // 1. Let O be ? RequireObjectCoercible(this value).
  const O = Q(RequireObjectCoercible(thisValue));
  // 2. Let S be ? ToString(O).
  const S = Q(ToString(O));
  // 3. Return IsStringWellFormedUnicode(S).
  return IsStringWellFormedUnicode(S) ? Value.true : Value.false;
}

/** http://tc39.es/ecma262/#sec-string.prototype.lastindexof */
function StringProto_lastIndexOf([searchString = Value.undefined, position = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O)).stringValue();
  const searchStr = Q(ToString(searchString)).stringValue();
  const numPos = Q(ToNumber(position));
  Assert(!(position === Value.undefined) || numPos.isNaN());
  let pos;
  if (numPos.isNaN()) {
    pos = Infinity;
  } else {
    pos = X(ToIntegerOrInfinity(numPos));
  }
  const len = S.length;
  const start = Math.min(Math.max(pos, 0), len);
  const searchLen = searchStr.length;
  let k = start;
  while (k >= 0) {
    if (k + searchLen <= len) {
      let match = true;
      for (let j = 0; j < searchLen; j += 1) {
        if (searchStr[j] !== S[k + j]) {
          match = false;
          break;
        }
      }
      if (match) {
        return F(k);
      }
    }
    k -= 1;
  }
  return F(-1);
}

/** http://tc39.es/ecma262/#sec-string.prototype.localecompare */
function StringProto_localeCompare([that = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O)).stringValue();
  const That = Q(ToString(that)).stringValue();
  if (S === That) {
    return F(+0);
  } else if (S < That) {
    return F(-1);
  } else {
    return F(1);
  }
}

/** http://tc39.es/ecma262/#sec-string.prototype.match */
function StringProto_match([regexp = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));

  if (regexp !== Value.undefined && regexp !== Value.null) {
    const matcher = Q(GetMethod(regexp, wellKnownSymbols.match));
    if (matcher !== Value.undefined) {
      return Q(Call(matcher, regexp, [O]));
    }
  }

  const S = Q(ToString(O));
  const rx = Q(RegExpCreate(regexp, Value.undefined));
  return Q(Invoke(rx, wellKnownSymbols.match, [S]));
}

/** http://tc39.es/ecma262/#sec-string.prototype.matchall */
function StringProto_matchAll([regexp = Value.undefined], { thisValue }) {
  // 1. Let O be ? RequireObjectCoercible(this value).
  const O = Q(RequireObjectCoercible(thisValue));
  // 2. If regexp is neither undefined nor null, then
  if (regexp !== Value.undefined && regexp !== Value.null) {
    // a. Let isRegExp be ? IsRegExp(regexp).
    const isRegExp = Q(IsRegExp(regexp));
    // b. If isRegExp is true, then
    if (isRegExp === Value.true) {
      // i. Let flags be ? Get(regexp, "flags").
      const flags = Q(Get(regexp, new Value('flags')));
      // ii. Perform ? RequireObjectCoercible(flags).
      Q(RequireObjectCoercible(flags));
      // iii. If ? ToString(flags) does not contain "g", throw a TypeError exception.
      if (!Q(ToString(flags)).stringValue().includes('g')) {
        return surroundingAgent.Throw('TypeError', 'StringPrototypeMethodGlobalRegExp', 'matchAll');
      }
    }
    // c. Let matcher be ? GetMethod(regexp, @@matchAll).
    const matcher = Q(GetMethod(regexp, wellKnownSymbols.matchAll));
    // d. If matcher is not undefined, then
    if (matcher !== Value.undefined) {
      // i. Return ? Call(matcher, regexp, « O »).
      return Q(Call(matcher, regexp, [O]));
    }
  }
  // 3. Let S be ? ToString(O).
  const S = Q(ToString(O));
  // 4. Let rx be ? RegExpCreate(regexp, "g").
  const rx = Q(RegExpCreate(regexp, new Value('g')));
  // 5. Return ? Invoke(rx, @@matchAll, « S »).
  return Q(Invoke(rx, wellKnownSymbols.matchAll, [S]));
}

/** http://tc39.es/ecma262/#sec-string.prototype.normalize */
function StringProto_normalize([form = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  if (form === Value.undefined) {
    form = new Value('NFC');
  } else {
    form = Q(ToString(form));
  }
  const f = form.stringValue();
  if (!['NFC', 'NFD', 'NFKC', 'NFKD'].includes(f)) {
    return surroundingAgent.Throw('RangeError', 'NormalizeInvalidForm');
  }
  const ns = S.stringValue().normalize(f);
  return new Value(ns);
}

/** http://tc39.es/ecma262/#sec-string.prototype.padend */
function StringProto_padEnd([maxLength = Value.undefined, fillString = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  return Q(StringPad(O, maxLength, fillString, 'end'));
}

/** http://tc39.es/ecma262/#sec-string.prototype.padstart */
function StringProto_padStart([maxLength = Value.undefined, fillString = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  return Q(StringPad(O, maxLength, fillString, 'start'));
}

/** http://tc39.es/ecma262/#sec-string.prototype.repeat */
function StringProto_repeat([count = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const n = Q(ToIntegerOrInfinity(count));
  if (n < 0) {
    return surroundingAgent.Throw('RangeError', 'StringRepeatCount', n);
  }
  if (n === Infinity || n === -Infinity) {
    return surroundingAgent.Throw('RangeError', 'StringRepeatCount', n);
  }
  if (n === 0) {
    return new Value('');
  }
  let T = '';
  for (let i = 0; i < n; i += 1) {
    T += S.stringValue();
  }
  return new Value(T);
}

/** http://tc39.es/ecma262/#sec-string.prototype.replace */
function StringProto_replace([searchValue = Value.undefined, replaceValue = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  if (searchValue !== Value.undefined && searchValue !== Value.null) {
    const replacer = Q(GetMethod(searchValue, wellKnownSymbols.replace));
    if (replacer !== Value.undefined) {
      return Q(Call(replacer, searchValue, [O, replaceValue]));
    }
  }
  const string = Q(ToString(O));
  const searchString = Q(ToString(searchValue));
  const functionalReplace = IsCallable(replaceValue);
  if (functionalReplace === Value.false) {
    replaceValue = Q(ToString(replaceValue));
  }
  const pos = string.stringValue().indexOf(searchString.stringValue());
  const matched = searchString;
  if (pos === -1) {
    return string;
  }
  let replStr;
  if (functionalReplace === Value.true) {
    const replValue = Q(Call(replaceValue, Value.undefined, [matched, F(pos), string]));
    replStr = Q(ToString(replValue));
  } else {
    const captures = [];
    replStr = X(GetSubstitution(matched, string, pos, captures, Value.undefined, replaceValue));
  }
  const tailPos = pos + matched.stringValue().length;
  const newString = string.stringValue().slice(0, pos) + replStr.stringValue() + string.stringValue().slice(tailPos);
  return new Value(newString);
}

/** http://tc39.es/ecma262/#sec-string.prototype.replaceall */
function StringProto_replaceAll([searchValue = Value.undefined, replaceValue = Value.undefined], { thisValue }) {
  // 1. Let O be ? RequireObjectCoercible(this value).
  const O = Q(RequireObjectCoercible(thisValue));
  // 2.If searchValue is neither undefined nor null, then
  if (searchValue !== Value.undefined && searchValue !== Value.null) {
    // a. Let isRegExp be ? IsRegExp(searchValue).
    const isRegExp = Q(IsRegExp(searchValue));
    // b. If isRegExp is true, then
    if (isRegExp === Value.true) {
      // i. Let flags be ? Get(searchValue, "flags").
      const flags = Q(Get(searchValue, new Value('flags')));
      // ii. Perform ? RequireObjectCoercible(flags).
      Q(RequireObjectCoercible(flags));
      // iii. If ? ToString(flags) does not contain "g", throw a TypeError exception.
      if (!Q(ToString(flags)).stringValue().includes('g')) {
        return surroundingAgent.Throw('TypeError', 'StringPrototypeMethodGlobalRegExp', 'replaceAll');
      }
    }
    // c. Let replacer be ? GetMethod(searchValue, @@replace).
    const replacer = Q(GetMethod(searchValue, wellKnownSymbols.replace));
    // d. If replacer is not undefined, then
    if (replacer !== Value.undefined) {
      // i. Return ? Call(replacer, searchValue, « O, replaceValue »).
      return Q(Call(replacer, searchValue, [O, replaceValue]));
    }
  }
  // 3. Let string be ? ToString(O).
  const string = Q(ToString(O));
  // 4. Let searchString be ? ToString(searchValue).
  const searchString = Q(ToString(searchValue));
  // 5. Let functionalReplace be IsCallable(replaceValue).
  const functionalReplace = IsCallable(replaceValue);
  // 6. If functionalReplace is false, then
  if (functionalReplace === Value.false) {
    // a. Let replaceValue be ? ToString(replaceValue).
    replaceValue = Q(ToString(replaceValue));
  }
  // 7. Let searchLength be the length of searchString.
  const searchLength = searchString.stringValue().length;
  // 8. Let advanceBy be max(1, searchLength).
  const advanceBy = Math.max(1, searchLength);
  // 9. Let matchPositions be a new empty List.
  const matchPositions = [];
  // 10. Let position be ! StringIndexOf(string, searchString, 0).
  let position = X(StringIndexOf(string, searchString, 0)).numberValue();
  // 11. Repeat, while position is not -1
  while (position !== -1) {
    // a. Append position to the end of matchPositions.
    matchPositions.push(position);
    // b. Let position be ! StringIndexOf(string, searchString, position + advanceBy).
    position = X(StringIndexOf(string, searchString, position + advanceBy)).numberValue();
  }
  // 12. Let endOfLastMatch be 0.
  let endOfLastMatch = 0;
  // 13. Let result be the empty string value.
  let result = '';
  // 14. For each position in matchPositions, do
  for (position of matchPositions) {
    let replacement;
    // a. If functionalReplace is true, then
    if (functionalReplace === Value.true) {
      // i. Let replacement be ? ToString(? Call(replaceValue, undefined, « searchString, 𝔽(position), string »).
      replacement = Q(ToString(Q(Call(replaceValue, Value.undefined, [searchString, F(position), string]))));
    } else { // b. Else,
      // i. Assert: Type(replaceValue) is String.
      Assert(replaceValue instanceof JSStringValue);
      // ii. Let captures be a new empty List.
      const captures = [];
      // iii. Let replacement be GetSubstitution(searchString, string, position, captures, undefined, replaceValue).
      replacement = GetSubstitution(searchString, string, position, captures, Value.undefined, replaceValue);
    }
    // c. Let stringSlice be the substring of string consisting of the code units from endOfLastMatch (inclusive) up through position (exclusive).
    const stringSlice = string.stringValue().slice(endOfLastMatch, position);
    // d. Let result be the string-concatenation of result, stringSlice, and replacement.
    result = result + stringSlice + replacement.stringValue();
    // e. Let endOfLastMatch be position + searchLength.
    endOfLastMatch = position + searchLength;
  }
  // 15. If endOfLastMatch < the length of string, then
  if (endOfLastMatch < string.stringValue().length) {
    // a. Let result be the string-concatenation of result and the substring of string consisting of the code units from endOfLastMatch (inclusive) up through the final code unit of string (inclusive).
    result += string.stringValue().slice(endOfLastMatch);
  }
  // 16. Return result.
  return new Value(result);
}

/** http://tc39.es/ecma262/#sec-string.prototype.slice */
function StringProto_search([regexp = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));

  if (regexp !== Value.undefined && regexp !== Value.null) {
    const searcher = Q(GetMethod(regexp, wellKnownSymbols.search));
    if (searcher !== Value.undefined) {
      return Q(Call(searcher, regexp, [O]));
    }
  }

  const string = Q(ToString(O));
  const rx = Q(RegExpCreate(regexp, Value.undefined));
  return Q(Invoke(rx, wellKnownSymbols.search, [string]));
}

/** http://tc39.es/ecma262/#sec-string.prototype.slice */
function StringProto_slice([start = Value.undefined, end = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O)).stringValue();
  const len = S.length;
  const intStart = Q(ToIntegerOrInfinity(start));
  let intEnd;
  if (end === Value.undefined) {
    intEnd = len;
  } else {
    intEnd = Q(ToIntegerOrInfinity(end));
  }
  let from;
  if (intStart < 0) {
    from = Math.max(len + intStart, 0);
  } else {
    from = Math.min(intStart, len);
  }
  let to;
  if (intEnd < 0) {
    to = Math.max(len + intEnd, 0);
  } else {
    to = Math.min(intEnd, len);
  }
  const span = Math.max(to - from, 0);
  return new Value(S.slice(from, from + span));
}

/** http://tc39.es/ecma262/#sec-string.prototype.split */
function StringProto_split([separator = Value.undefined, limit = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  if (separator !== Value.undefined && separator !== Value.null) {
    const splitter = Q(GetMethod(separator, wellKnownSymbols.split));
    if (splitter !== Value.undefined) {
      return Q(Call(splitter, separator, [O, limit]));
    }
  }
  const S = Q(ToString(O));
  const A = X(ArrayCreate(0));
  let lengthA = 0;
  let lim;
  if (limit === Value.undefined) {
    lim = F((2 ** 32) - 1);
  } else {
    lim = Q(ToUint32(limit));
  }
  const s = S.stringValue().length;
  let p = 0;
  const R = Q(ToString(separator));
  if (lim.numberValue() === 0) {
    return A;
  }
  if (separator === Value.undefined) {
    X(CreateDataPropertyOrThrow(A, new Value('0'), S));
    return A;
  }
  if (s === 0) {
    if (R.stringValue() !== '') {
      X(CreateDataPropertyOrThrow(A, new Value('0'), S));
    }
    return A;
  }
  let q = p;
  while (q !== s) {
    const e = SplitMatch(S, q, R);
    if (e === false) {
      q += 1;
    } else {
      if (e === p) {
        q += 1;
      } else {
        const T = new Value(S.stringValue().substring(p, q));
        X(CreateDataPropertyOrThrow(A, X(ToString(F(lengthA))), T));
        lengthA += 1;
        if (lengthA === lim.numberValue()) {
          return A;
        }
        p = e;
        q = p;
      }
    }
  }
  const T = new Value(S.stringValue().substring(p, s));
  X(CreateDataPropertyOrThrow(A, X(ToString(F(lengthA))), T));
  return A;
}

/** http://tc39.es/ecma262/#sec-splitmatch */
function SplitMatch(S, q, R) {
  Assert(R instanceof JSStringValue);
  const r = R.stringValue().length;
  const s = S.stringValue().length;
  if (q + r > s) {
    return false;
  }
  for (let i = 0; i < r; i += 1) {
    if (S.stringValue().charCodeAt(q + i) !== R.stringValue().charCodeAt(i)) {
      return false;
    }
  }
  return q + r;
}

/** http://tc39.es/ecma262/#sec-string.prototype.startswith */
function StringProto_startsWith([searchString = Value.undefined, position = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O)).stringValue();
  const isRegExp = Q(IsRegExp(searchString));
  if (isRegExp === Value.true) {
    return surroundingAgent.Throw('TypeError', 'RegExpArgumentNotAllowed', 'String.prototype.startsWith');
  }
  const searchStr = Q(ToString(searchString)).stringValue();
  const pos = Q(ToIntegerOrInfinity(position));
  Assert(!(position === Value.undefined) || pos === 0);
  const len = S.length;
  const start = Math.min(Math.max(pos, 0), len);
  const searchLength = searchStr.length;
  if (searchLength + start > len) {
    return Value.false;
  }
  for (let i = 0; i < searchLength; i += 1) {
    if (S.charCodeAt(start + i) !== searchStr.charCodeAt(i)) {
      return Value.false;
    }
  }
  return Value.true;
}

/** http://tc39.es/ecma262/#sec-string.prototype.substring */
function StringProto_substring([start = Value.undefined, end = Value.undefined], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O)).stringValue();
  const len = S.length;
  const intStart = Q(ToIntegerOrInfinity(start));
  let intEnd;
  if (end === Value.undefined) {
    intEnd = len;
  } else {
    intEnd = Q(ToIntegerOrInfinity(end));
  }
  const finalStart = Math.min(Math.max(intStart, 0), len);
  const finalEnd = Math.min(Math.max(intEnd, 0), len);
  const from = Math.min(finalStart, finalEnd);
  const to = Math.max(finalStart, finalEnd);
  return new Value(S.slice(from, to));
}

/** http://tc39.es/ecma262/#sec-string.prototype.tolocalelowercase */
function StringProto_toLocaleLowerCase(args, { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const L = S.stringValue().toLocaleLowerCase();
  return new Value(L);
}

/** http://tc39.es/ecma262/#sec-string.prototype.tolocaleuppercase */
function StringProto_toLocaleUpperCase(args, { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const L = S.stringValue().toLocaleUpperCase();
  return new Value(L);
}

/** http://tc39.es/ecma262/#sec-string.prototype.tolowercase */
function StringProto_toLowerCase(args, { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const L = S.stringValue().toLowerCase();
  return new Value(L);
}

/** http://tc39.es/ecma262/#sec-string.prototype.tostring */
function StringProto_toString(args, { thisValue }) {
  return Q(thisStringValue(thisValue));
}

/** http://tc39.es/ecma262/#sec-string.prototype.touppercase */
function StringProto_toUpperCase(args, { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const L = S.stringValue().toUpperCase();
  return new Value(L);
}

/** https://tc39.es/proposal-is-usv-string/#sec-string.prototype.towellformed */
function StringProto_toWellFormed(args, { thisValue }) {
  // 1. Let O be ? RequireObjectCoercible(this value).
  const O = Q(RequireObjectCoercible(thisValue));
  // 2. Let S be ? ToString(O).
  const S = Q(ToString(O));
  // 3. Let strLen be the length of S.
  const strLen = S.stringValue().length;
  // 4. Let k be 0.
  let k = 0;
  // 5. Let result be the empty String.
  let result = '';
  // 6. Repeat, while k < strLen,
  while (k < strLen) {
    // a. Let cp be CodePointAt(S, k).
    const cp = CodePointAt(S.stringValue(), k);
    // b. If cp.[[IsUnpairedSurrogate]] is true, then
    if (cp.IsUnpairedSurrogate) {
      // i. Set result to the string-concatenation of result and 0xFFFD (REPLACEMENT CHARACTER).
      result += '\uFFFD';
    } else { // c. Else,
      // i. Set result to the string-concatenation of result and UTF16EncodeCodePoint(cp.[[CodePoint]]).
      result += UTF16EncodeCodePoint(cp.CodePoint);
    }
    // d. Set k to k + cp.[[CodeUnitCount]].
    k += cp.CodeUnitCount;
  }
  // 7. Return result.
  return new Value(result);
}

/** http://tc39.es/ecma262/#sec-string.prototype.trim */
function StringProto_trim(args, { thisValue }) {
  const S = thisValue;
  return Q(TrimString(S, 'start+end'));
}

/** http://tc39.es/ecma262/#sec-string.prototype.trimend */
function StringProto_trimEnd(args, { thisValue }) {
  const S = thisValue;
  return Q(TrimString(S, 'end'));
}

/** http://tc39.es/ecma262/#sec-string.prototype.trimstart */
function StringProto_trimStart(args, { thisValue }) {
  const S = thisValue;
  return Q(TrimString(S, 'start'));
}

/** http://tc39.es/ecma262/#sec-string.prototype.valueof */
function StringProto_valueOf(args, { thisValue }) {
  return Q(thisStringValue(thisValue));
}

/** http://tc39.es/ecma262/#sec-string.prototype-@@iterator */
function StringProto_iterator(args, { thisValue }) {
  // 1. Let O be ? RequireObjectCoercible(this value).
  const O = Q(RequireObjectCoercible(thisValue));
  // 2. Let s be ? ToString(O).
  const s = Q(ToString(O)).stringValue();
  // 3. Let closure be a new Abstract Closure with no parameters that captures s and performs the following steps when called:
  const closure = function* closure() {
    // a. Let position be 0.
    let position = 0;
    // b. Let len be the length of s.
    const len = s.length;
    // c. Repeat, while position < len,
    while (position < len) {
      // i. Let cp be ! CodePointAt(s, position).
      const cp = X(CodePointAt(s, position));
      // ii. Let nextIndex be position + cp.[[CodeUnitCount]].
      const nextIndex = position + cp.CodeUnitCount;
      // iii. Let resultString be the substring of s from position to nextIndex.
      const resultString = new Value(s.slice(position, nextIndex));
      // iv. Set position to nextIndex.
      position = nextIndex;
      // v. Perform ? Yield(resultString).
      Q(yield* Yield(resultString));
    }
    // d. Return undefined.
    return Value.undefined;
  };
  // 4. Return ! CreateIteratorFromClosure(closure, "%StringIteratorPrototype%", %StringIteratorPrototype%).
  return X(CreateIteratorFromClosure(closure, new Value('%StringIteratorPrototype%'), surroundingAgent.intrinsic('%StringIteratorPrototype%')));
}

/** http://tc39.es/ecma262/#sec-string.prototype.at */
function StringProto_at([index = Value.undefined], { thisValue }) {
  // 1. Let O be ? RequireObjectCoercible(this value).
  const O = Q(RequireObjectCoercible(thisValue));
  // 2. Let S be ? ToString(O).
  const S = Q(ToString(O));
  // 3. Let len be the length of S.
  const len = S.stringValue().length;
  // 4. Let relativeIndex be ? ToIntegerOrInfinity(index).
  const relativeIndex = Q(ToIntegerOrInfinity(index));
  let k;
  // 5. If relativeIndex ≥ 0, then
  if (relativeIndex >= 0) {
    // a. Let k be relativeIndex.
    k = relativeIndex;
  } else { // 6. Else,
    // a. Let k be len + relativeIndex.
    k = len + relativeIndex;
  }
  // 7. If k < 0 or k ≥ len, then return undefined.
  if (k < 0 || k >= len) {
    return Value.undefined;
  }
  // 8. Return the String value consisting of only the code unit at position k in S.
  return new Value(S.stringValue()[k]);
}

export function bootstrapStringPrototype(realmRec) {
  const proto = StringCreate(new Value(''), realmRec.Intrinsics['%Object.prototype%']);

  assignProps(realmRec, proto, [
    ['charAt', StringProto_charAt, 1],
    ['charCodeAt', StringProto_charCodeAt, 1],
    ['codePointAt', StringProto_codePointAt, 1],
    ['concat', StringProto_concat, 1],
    ['endsWith', StringProto_endsWith, 1],
    ['includes', StringProto_includes, 1],
    ['indexOf', StringProto_indexOf, 1],
    surroundingAgent.feature('is-usv-string')
      ? ['isWellFormed', StringProto_isWellFormed, 0]
      : undefined,
    ['at', StringProto_at, 1],
    ['lastIndexOf', StringProto_lastIndexOf, 1],
    ['localeCompare', StringProto_localeCompare, 1],
    ['match', StringProto_match, 1],
    ['matchAll', StringProto_matchAll, 1],
    ['normalize', StringProto_normalize, 0],
    ['padEnd', StringProto_padEnd, 1],
    ['padStart', StringProto_padStart, 1],
    ['repeat', StringProto_repeat, 1],
    ['replace', StringProto_replace, 2],
    ['replaceAll', StringProto_replaceAll, 2],
    ['search', StringProto_search, 1],
    ['slice', StringProto_slice, 2],
    ['split', StringProto_split, 2],
    ['startsWith', StringProto_startsWith, 1],
    ['substring', StringProto_substring, 2],
    ['toLocaleLowerCase', StringProto_toLocaleLowerCase, 0],
    ['toLocaleUpperCase', StringProto_toLocaleUpperCase, 0],
    ['toLowerCase', StringProto_toLowerCase, 0],
    ['toString', StringProto_toString, 0],
    ['toUpperCase', StringProto_toUpperCase, 0],
    surroundingAgent.feature('is-usv-string')
      ? ['toWellFormed', StringProto_toWellFormed, 0]
      : undefined,
    ['trim', StringProto_trim, 0],
    ['trimEnd', StringProto_trimEnd, 0],
    ['trimStart', StringProto_trimStart, 0],
    ['valueOf', StringProto_valueOf, 0],
    [wellKnownSymbols.iterator, StringProto_iterator, 0],
  ]);

  realmRec.Intrinsics['%String.prototype%'] = proto;
}
