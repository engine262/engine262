import { surroundingAgent } from '../engine.mjs';
import {
  CreateBuiltinFunction,
  ObjectCreate,
  SetFunctionLength,
  SetFunctionName,
  SameValueZero,
  IsCallable,
  Call,
} from '../abstract-ops/all.mjs';
import { Type, New as NewValue, wellKnownSymbols } from '../value.mjs';
import { Q, X } from '../completion.mjs';

function SetProto_add([value], { thisValue }) {
  const S = thisValue;
  if (Type(S) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('SetData' in S)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = S.SetData;
  for (const e of entries) {
    if (e !== undefined && SameValueZero(e, value).isTrue()) {
      return S;
    }
  }
  if (Type(value) === 'Number' && Object.is(value.numberValue(), -0)) {
    value = NewValue(0);
  }
  entries.push(value);
  return S;
}

function SetProto_clear(args, { thisValue }) {
  const S = thisValue;
  if (Type(S) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('SetData' in S)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = S.SetData;
  for (let i = 0; i < entries.length; i += 1) {
    entries[i] = undefined;
  }
  return NewValue(undefined);
}

function SetProto_delete([value], { thisValue }) {
  const S = thisValue;
  if (Type(S) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('SetData' in S)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = S.SetData;
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    if (e !== undefined && SameValueZero(e, value).isTrue()) {
      entries[i] = undefined;
      return NewValue(true);
    }
  }
  return NewValue(false);
}

function SetProto_entries() {}

function SetProto_forEach([callbackfn, thisArg], { thisValue }) {
  const S = thisValue;
  if (Type(S) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('SetData' in S)) {
    return surroundingAgent.Throw('TypeError');
  }
  if (IsCallable(callbackfn).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  let T;
  if (thisArg !== undefined) {
    T = thisArg;
  } else {
    T = NewValue(undefined);
  }
  const entries = S.SetData;
  for (const e of entries) {
    if (e !== undefined) {
      Q(Call(callbackfn, T, [e, e, S]));
    }
  }
  return NewValue(undefined);
}

function SetProto_has([value], { thisValue }) {
  const S = thisValue;
  if (Type(S) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('SetData' in S)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = S.SetData;
  for (const e of entries) {
    if (e !== undefined && SameValueZero(e, value).isTrue()) {
      return NewValue(true);
    }
  }
  return NewValue(false);
}

function SetProto_keys() {}

function SetProto_values() {}

function SetProto_size(args, { thisValue }) {
  const S = thisValue;
  if (Type(S) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('SetData' in S)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = S.SetData;
  let count = 0;
  for (const e of entries) {
    if (e !== undefined) {
      count += 1;
    }
  }
  return NewValue(count);
}

export function CreateSetPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%ObjectPrototype%']);

  [
    ['add', SetProto_add, 1],
    ['clear', SetProto_clear, 0],
    ['delete', SetProto_delete, 1],
    ['entries', SetProto_entries, 0],
    ['forEach', SetProto_forEach, 1],
    ['has', SetProto_has, 1],
    ['keys', SetProto_keys, 0],
    ['values', SetProto_values, 0],
  ].forEach(([name, nativeFunction, length]) => {
    const fn = CreateBuiltinFunction(nativeFunction, [], realmRec);
    SetFunctionName(fn, NewValue(name));
    SetFunctionLength(fn, NewValue(length));
    X(proto.DefineOwnProperty(NewValue(name), {
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    }));
  });

  {
    const fn = CreateBuiltinFunction(SetProto_size, [], realmRec);
    SetFunctionName(fn, NewValue('size'));
    SetFunctionLength(fn, NewValue(0));
    X(proto.DefineOwnProperty(NewValue('size'), {
      Get: fn,
      Set: NewValue(undefined),
      Enumerable: false,
      Configurable: true,
    }));
  }

  X(proto.DefineOwnProperty(wellKnownSymbols.iterator, Q(proto.GetOwnProperty(NewValue('values')))));

  X(proto.DefineOwnProperty(wellKnownSymbols.toStringTag, {
    Value: NewValue('Set'),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  }));
  realmRec.Intrinsics['%SetPrototype%'] = proto;
}
