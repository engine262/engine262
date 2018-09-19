import { surroundingAgent } from '../engine.mjs';
import {
  Call,
  CreateBuiltinFunction,
  ObjectCreate,
  IsCallable,
  SameValueZero,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import { Type, New as NewValue, wellKnownSymbols } from '../value.mjs';
import { Q, X } from '../completion.mjs';

function CreateMapIterator(map, kind) {
  if (Type(map) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('MapData' in map)) {
    return surroundingAgent.Throw('TypeError');
  }
  const iterator = ObjectCreate(surroundingAgent.intrinsic('%MapIteratorPrototype%'), [
    'Map',
    'MapNextIndex',
    'MapIterationKind',
  ]);
  iterator.Map = map;
  iterator.MapNextIndex = 0;
  iterator.MapIterationKind = kind;
}

function MapProto_clear(args, { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = M.MapData;
  for (const p of entries) {
    p.Key = undefined;
    p.Value = undefined;
  }
  return NewValue(undefined);
}

function MapProto_delete([key], { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = M.MapData;
  for (let i = 0; i < entries.length; i += 1) {
    const p = entries[i];
    if (p.Key !== undefined && SameValueZero(p.Key, key).isTrue()) {
      p.Key = undefined;
      p.Value = undefined;

      // The value empty is used as a specification device to indicate that an
      // entry has been deleted. Actual implementations may take other actions
      // such as physically removing the entry from internal data structures.
      entries.splice(i, 1);

      return NewValue(true);
    }
  }
  return NewValue(false);
}

function MapProto_entries(args, { thisValue }) {
  const M = thisValue;
  return Q(CreateMapIterator(M, 'key+value'));
}

function MapProto_forEach([callbackfn, thisArg], { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('MapData' in M)) {
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
  const entries = M.MapData;
  for (const e of entries) {
    if (e.Key !== undefined) {
      Q(Call(callbackfn, T, [e.Value, e.Key, M]));
    }
  }
  return NewValue(undefined);
}

function MapProto_get([key], { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = M.MapData;
  for (const p of entries) {
    if (p.Key !== undefined && SameValueZero(p.Key, key).isTrue()) {
      return p.Value;
    }
  }
  return NewValue(undefined);
}

function MapProto_has([key], { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = M.MapData;
  for (const p of entries) {
    if (p.Key !== undefined && SameValueZero(p.Key, key).isTrue()) {
      return NewValue(true);
    }
  }
  return NewValue(false);
}

function MapProto_keys(args, { thisValue }) {
  const M = thisValue;
  return Q(CreateMapIterator(M, 'key'));
}

function MapProto_set([key, value], { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = M.MapData;
  for (const p of entries) {
    if (p.Key !== undefined && SameValueZero(p.Key, key).isTrue()) {
      p.Value = value;
      return M;
    }
  }
  if (Type(key) === 'Number' && Object.is(key.numberValue(), -0)) {
    key = NewValue(0);
  }
  const p = { Key: key, Value: value };
  entries.push(p);
  return M;
}

function MapProto_size(args, { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError');
  }
  const entries = M.MapData;
  let count = 0;
  for (const p of entries) {
    if (p.Key !== undefined) {
      count += 1;
    }
  }
  return NewValue(count);
}

function MapProto_values(args, { thisValue }) {
  const M = thisValue;
  return Q(CreateMapIterator(M, 'value'));
}

export function CreateMapPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%ObjectPrototype%']);

  [
    ['clear', MapProto_clear, 0],
    ['delete', MapProto_delete, 1],
    ['entries', MapProto_entries, 0],
    ['forEach', MapProto_forEach, 1],
    ['get', MapProto_get, 1],
    ['has', MapProto_has, 1],
    ['keys', MapProto_keys, 0],
    ['set', MapProto_set, 2],
    ['values', MapProto_values, 0],
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
    const fn = CreateBuiltinFunction(MapProto_size, [], realmRec);
    SetFunctionName(fn, NewValue('size'));
    SetFunctionLength(fn, NewValue(0));
    X(proto.DefineOwnProperty(NewValue('size'), {
      Get: fn,
      Set: NewValue(undefined),
      Enumerable: false,
      Configurable: true,
    }));
  }

  X(proto.DefineOwnProperty(wellKnownSymbols.iterator, Q(proto.GetOwnProperty(NewValue('entries')))));

  X(proto.DefineOwnProperty(wellKnownSymbols.toStringTag, {
    Value: NewValue('Map'),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  }));

  realmRec.Intrinsics['%MapPrototype%'] = proto;
}
