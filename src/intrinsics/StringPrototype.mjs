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
  Descriptor,
  StringExoticObjectValue,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { UTF16Decode } from '../static-semantics/all.mjs';
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

function StringProto_codePointAt([pos], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const position = Q(ToInteger(pos)).numberValue();
  const size = S.stringValue().length;
  if (position < 0 || position >= size) {
    return Value.undefined;
  }
  const first = S.stringValue().charCodeAt(position);
  if (first < 0xD800 || first > 0xDBFF || position + 1 === size) {
    return new Value(first);
  }
  const second = S.stringValue().charCodeAt(position + 1);
  if (second < 0xDC00 || second > 0xDFFF) {
    return new Value(first);
  }
  return new Value(UTF16Decode(first, second));
}

function StringProto_concat([...args], { thisValue }) {
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

function StringProto_toString(args, { thisValue }) {
  return Q(thisStringValue(thisValue));
}

function StringProto_trim(args, { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const T = S.stringValue().trim();
  return new Value(T);
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
    ['codePointAt', StringProto_codePointAt, 1],
    ['concat', StringProto_concat, 1],
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
    ['trim', StringProto_trim, 0],
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
