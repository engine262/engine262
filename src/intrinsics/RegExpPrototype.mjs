import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Get,
  SameValue,
  ToBoolean,
  // ToLength,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { Q } from '../completion.mjs';
import { msg } from '../helpers.mjs';

// 21.2.5.2 #sec-regexp.prototype.exec
function RegExpProto_exec([string = Value.undefined], { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  if (!('RegExpMatcher' in R)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  const S = Q(ToString(string));
  return Q(RegExpBuiltinExec(R, S));
}

// 21.2.5.2.2 #sec-regexpbuiltinexec
function RegExpBuiltinExec(/* R, S */) {
  // Assert(R.RegExpMatcher);
  // Assert(Type(S) === 'String');
  // const length = S.stringValue().length;
  // const lastIndexStr = new Value('lastIndex');
  // let lastIndex = Q(ToLength(Q(Get(R, lastIndexStr))));
  // const flags = R.OriginalFlags.stringValue();
  // const global = flags.includes('g');
  // const sticky = flags.includes('y');
  // if (!global && !sticky) {
  //   lastIndex = 0;
  // }
  // const matcher = R.RegExpMatcher;
  // const fullUnicode = flags.includes('u');
  // const matchSucceeded = false;
  // TODO continue algorithm...
  return surroundingAgent.Throw('Error', 'RegExpBuiltinExec is not implemented');
}

// 21.2.5.3 #sec-get-regexp.prototype.dotall
function RegExpProto_dotAllGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExpPrototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
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
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
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
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExpPrototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
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
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExpPrototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  const flags = R.OriginalFlags;
  if (flags.stringValue().includes('i')) {
    return Value.true;
  }
  return Value.false;
}

// 21.2.5.7 #sec-get-regexp.prototype-@@match
function RegExpProto_match(/* [string], { thisValue } */) {
  return surroundingAgent.Throw('Error', 'RegExp.prototype[@@match] is not implemented');
}

// 21.2.5.8 #sec-get-regexp.prototype.multiline
function RegExpProto_multilineGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExpPrototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  const flags = R.OriginalFlags;
  if (flags.stringValue().includes('m')) {
    return Value.true;
  }
  return Value.false;
}

// 21.2.5.9 #sec-get-regexp.prototype-@@replace
function RegExpProto_replace(/* [string, replaceValue], { thisValue } */) {
  return surroundingAgent.Throw('Error', 'RegExp.prototype[@@replace] is not implemented');
}

// 21.2.5.10 #sec-get-regexp.prototype-@@search
function RegExpProto_search(/* [string], { thisValue } */) {
  return surroundingAgent.Throw('Error', 'RegExp.prototype[@@search] is not implemented');
}

// 21.2.5.11 #sec-get-regexp.prototype.source
function RegExpProto_sourceGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  if (!('OriginalSource' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExpPrototype%')) === Value.true) {
      return new Value('(?:)');
    }
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  Assert('OriginalFlags' in R);
  // const src = R.OriginalSource;
  // const flags = R.OriginalFlags;
  // TODO: return EscapeRegExpPattern(src, flags);
  return surroundingAgent.Throw('Error', 'EscapeRegExpPattern is not implemented');
}

// 21.2.5.12 #sec-get-regexp.prototype-@@split
function RegExpProto_split(/* [string, limit], { thisValue } */) {
  return surroundingAgent.Throw('Error', 'RegExp.prototype[@@split] is not implemented');
}

// 21.2.5.13 #sec-get-regexp.prototype.sticky
function RegExpProto_stickyGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExpPrototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  const flags = R.OriginalFlags;
  if (flags.stringValue().includes('y')) {
    return Value.true;
  }
  return Value.false;
}

// 21.2.5.14 #sec-get-regexp.prototype.test
function RegExpProto_test(/* [S], { thisValue } */) {
  return surroundingAgent.Throw('Error', 'RegExp.prototype.test is not implemented');
}

// 21.2.5.15 #sec-get-regexp.prototype.toString
function RegExpProto_toString(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  const pattern = Q(ToString(Q(Get(R, new Value('source')))));
  const flags = Q(ToString(Q(Get(R, new Value('flags')))));
  const result = `/${pattern.stringValue()}/${flags.stringValue()}`;
  return new Value(result);
}

// 21.2.5.16 #sec-get-regexp.prototype.unicode
function RegExpProto_unicodeGetter(args, { thisValue }) {
  const R = thisValue;
  if (Type(R) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  if (!('OriginalFlags' in R)) {
    if (SameValue(R, surroundingAgent.intrinsic('%RegExpPrototype%')) === Value.true) {
      return Value.undefined;
    }
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'RegExp', R));
  }
  const flags = R.OriginalFlags;
  if (flags.stringValue().includes('u')) {
    return Value.true;
  }
  return Value.false;
}

export function CreateRegExpPrototype(realmRec) {
  const proto = BootstrapPrototype(
    realmRec,
    [
      ['exec', RegExpProto_exec, 1],
      ['dotAll', [RegExpProto_dotAllGetter]],
      ['flags', [RegExpProto_flagsGetter]],
      ['global', [RegExpProto_globalGetter]],
      ['ignoreCase', [RegExpProto_ignoreCaseGetter]],
      [wellKnownSymbols.match, RegExpProto_match, 1],
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
    realmRec.Intrinsics['%ObjectPrototype%'],
    'RegExp',
  );

  realmRec.Intrinsics['%RegExpPrototype%'] = proto;
}
