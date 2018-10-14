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
import {
  Type,
  Value,
  Descriptor,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// #sec-CreateSetIterator
function CreateSetIterator(set, kind) {
  if (Type(set) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('SetData' in set)) {
    return surroundingAgent.Throw('TypeError');
  }
  const iterator = ObjectCreate(surroundingAgent.intrinsic('%SetIteratorPrototype%'), [
    'IteratedSet',
    'SetNextIndex',
    'SetIterationKind',
  ]);
  iterator.IteratedSet = set;
  iterator.SetNextIndex = 0;
  iterator.SetIterationKind = kind;
  return iterator;
}

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
    if (e !== undefined && SameValueZero(e, value) === Value.true) {
      return S;
    }
  }
  if (Type(value) === 'Number' && Object.is(value.numberValue(), -0)) {
    value = new Value(0);
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
  return Value.undefined;
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
    if (e !== undefined && SameValueZero(e, value) === Value.true) {
      entries[i] = undefined;
      return Value.true;
    }
  }
  return Value.false;
}

function SetProto_entries(args, { thisValue }) {
  const S = thisValue;
  return Q(CreateSetIterator(S, 'key+value'));
}

function SetProto_forEach([callbackfn, thisArg], { thisValue }) {
  const S = thisValue;
  if (Type(S) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('SetData' in S)) {
    return surroundingAgent.Throw('TypeError');
  }
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError');
  }
  let T;
  if (thisArg !== undefined) {
    T = thisArg;
  } else {
    T = Value.undefined;
  }
  const entries = S.SetData;
  for (const e of entries) {
    if (e !== undefined) {
      Q(Call(callbackfn, T, [e, e, S]));
    }
  }
  return Value.undefined;
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
    if (e !== undefined && SameValueZero(e, value) === Value.true) {
      return Value.true;
    }
  }
  return Value.false;
}

function SetProto_values(args, { thisValue }) {
  const S = thisValue;
  return Q(CreateSetIterator(S, 'value'));
}

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
  return new Value(count);
}

export function CreateSetPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['add', SetProto_add, 1],
    ['clear', SetProto_clear, 0],
    ['delete', SetProto_delete, 1],
    ['entries', SetProto_entries, 0],
    ['forEach', SetProto_forEach, 1],
    ['has', SetProto_has, 1],
    ['values', SetProto_values, 0],
  ], realmRec.Intrinsics['%ObjectPrototype%'], 'Set');

  {
    const fn = CreateBuiltinFunction(SetProto_size, [], realmRec);
    SetFunctionName(fn, new Value('size'));
    SetFunctionLength(fn, new Value(0));
    X(proto.DefineOwnProperty(new Value('size'), Descriptor({
      Get: fn,
      Set: Value.undefined,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  const valuesFunc = X(proto.GetOwnProperty(new Value('values')));
  X(proto.DefineOwnProperty(new Value('keys'), valuesFunc));
  X(proto.DefineOwnProperty(wellKnownSymbols.iterator, valuesFunc));

  realmRec.Intrinsics['%SetPrototype%'] = proto;
}
