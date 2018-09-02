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
  New as NewValue,
  StringExoticObjectValue,
  Type,
} from '../value.mjs';
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
    return NewValue('');
  }
  return NewValue(S.stringValue()[position]);
}

function StringProto_charCodeAt([pos], { thisValue }) {
  const O = Q(RequireObjectCoercible(thisValue));
  const S = Q(ToString(O));
  const position = Q(ToInteger(pos)).numberValue();
  const size = S.stringValue().length;
  if (position < 0 || position >= size) {
    return NewValue(NaN);
  }
  return S.stringValue().charCodeAt(position);
}

function StringProto_toString(args, { thisValue }) {
  return Q(thisStringValue(thisValue));
}
function StringProto_valueOf(args, { thisValue }) {
  return Q(thisStringValue(thisValue));
}

export function CreateStringPrototype(realmRec) {
  const proto = new StringExoticObjectValue();
  proto.Prototype = realmRec.Intrinsics['%ObjectPrototype%'];
  proto.Extensible = true;
  proto.StringData = NewValue('');

  [
    ['charAt', StringProto_charAt, 1],
    ['charCodeAt', StringProto_charCodeAt, 1],
    ['toString', StringProto_toString, 0],
    ['valueOf', StringProto_valueOf, 0],
  ].forEach(([name, fn, length]) => {
    const n = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(n, NewValue(name));
    SetFunctionLength(n, NewValue(length));
    proto.DefineOwnProperty(NewValue(name), {
      Value: n,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%StringPrototype%'] = proto;
}
