import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  RequireObjectCoercible,
  SetFunctionLength,
  SetFunctionName,
  ToInteger,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Value,
  StringExoticObjectValue,
  Type,
  Descriptor,
  wellKnownSymbols,
} from '../value.mjs';
import { CreateStringIterator } from './StringIteratorPrototype.mjs';
import { Q } from '../completion.mjs';

function thisStringValue(value) {
  if (Type(value) === 'String') {
    return value;
  }
  if (Type(value) === 'Object' && 'StringData' in value) {
    Assert(Type(value.StringData) === 'String');
    return value.StringData;
  }
  return surroundingAgent.TypeError('TypeError');
}

function StringProto_charAt([pos], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const position = Q(ToInteger(pos)).numberValue();
  const size = S.stringValue().length;
  if (position < 0 || position >= size) {
    return new Value('');
  }
  return new Value(S.stringValue()[position]);
}

function StringProto_charCodeAt([pos], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const position = Q(ToInteger(pos)).numberValue();
  const size = S.stringValue().length;
  if (position < 0 || position >= size) {
    return new Value(NaN);
  }
  return S.stringValue().charCodeAt(position);
}

function StringProto_toString(args, { thisValue }) {
  return Q(thisStringValue(thisValue));
}

function StringProto_valueOf(args, { thisValue }) {
  return Q(thisStringValue(thisValue));
}

function StringProto_symbolIterator(args, { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  return Q(CreateStringIterator(S));
}

export function CreateStringPrototype(realmRec) {
  const proto = new StringExoticObjectValue();
  proto.Prototype = realmRec.Intrinsics['%ObjectPrototype%'];
  proto.Extensible = Value.true;
  proto.StringData = new Value('');

  [
    ['charAt', StringProto_charAt, 1],
    ['charCodeAt', StringProto_charCodeAt, 1],
    // codePointAt
    // concat
    // endsWith
    // includes
    // indexOf
    // lastIndexOf
    // localeCompare
    // match
    // normalize
    // padEnd
    // padStart
    // padEnd
    // repeat
    // replace
    // search
    // slice
    // split
    // startsWith
    // substring
    // toLocaleLowerCase
    // toLocaleUpperCase
    // toLowerCase
    ['toString', StringProto_toString, 0],
    // toUpperCase
    // trim
    ['valueOf', StringProto_valueOf, 0],
    [wellKnownSymbols.iterator, StringProto_symbolIterator, 0],
  ].forEach(([name, fn, length]) => {
    if (!(name instanceof Value)) {
      name = new Value(name);
    }
    const n = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(n, name);
    SetFunctionLength(n, new Value(length));
    proto.DefineOwnProperty(name, Descriptor({
      Value: n,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    }));
  });

  realmRec.Intrinsics['%StringPrototype%'] = proto;
}
