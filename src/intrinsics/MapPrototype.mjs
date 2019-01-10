import { surroundingAgent } from '../engine.mjs';
import {
  Call,
  IsCallable,
  ObjectCreate,
  SameValueZero,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { msg } from '../helpers.mjs';

function CreateMapIterator(map, kind) {
  if (Type(map) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Cannot create map iterator from incompatible receiver');
  }
  if (!('MapData' in map)) {
    return surroundingAgent.Throw('TypeError', 'Cannot create map iterator from incompatible receiver');
  }
  const iterator = ObjectCreate(surroundingAgent.intrinsic('%MapIteratorPrototype%'), [
    'Map',
    'MapNextIndex',
    'MapIterationKind',
  ]);
  iterator.Map = map;
  iterator.MapNextIndex = 0;
  iterator.MapIterationKind = kind;
  return iterator;
}

function MapProto_clear(args, { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.clear'));
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.clear'));
  }
  const entries = M.MapData;
  for (const p of entries) {
    p.Key = undefined;
    p.Value = undefined;
  }
  return Value.undefined;
}

function MapProto_delete([key = Value.undefined], { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.delete'));
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.delete'));
  }
  const entries = M.MapData;
  for (let i = 0; i < entries.length; i += 1) {
    const p = entries[i];
    if (p.Key !== undefined && SameValueZero(p.Key, key) === Value.true) {
      p.Key = undefined;
      p.Value = undefined;

      // The value empty is used as a specification device to indicate that an
      // entry has been deleted. Actual implementations may take other actions
      // such as physically removing the entry from internal data structures.
      // entries.splice(i, 1);

      return Value.true;
    }
  }
  return Value.false;
}

function MapProto_entries(args, { thisValue }) {
  const M = thisValue;
  return Q(CreateMapIterator(M, 'key+value'));
}

function MapProto_forEach([callbackfn, thisArg], { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.entries'));
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.entries'));
  }
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('NotAFunction', callbackfn));
  }
  let T;
  if (thisArg !== undefined) {
    T = thisArg;
  } else {
    T = Value.undefined;
  }
  const entries = M.MapData;
  for (const e of entries) {
    if (e.Key !== undefined) {
      Q(Call(callbackfn, T, [e.Value, e.Key, M]));
    }
  }
  return Value.undefined;
}

function MapProto_get([key = Value.undefined], { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.get'));
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.get'));
  }
  const entries = M.MapData;
  for (const p of entries) {
    if (p.Key !== undefined && SameValueZero(p.Key, key) === Value.true) {
      return p.Value;
    }
  }
  return Value.undefined;
}

function MapProto_has([key = Value.undefined], { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.has'));
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.has'));
  }
  const entries = M.MapData;
  for (const p of entries) {
    if (p.Key !== undefined && SameValueZero(p.Key, key) === Value.true) {
      return Value.true;
    }
  }
  return Value.false;
}

function MapProto_keys(args, { thisValue }) {
  const M = thisValue;
  return Q(CreateMapIterator(M, 'key'));
}

function MapProto_set([key = Value.undefined, value = Value.undefined], { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.set'));
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'Map.prototype.set'));
  }
  const entries = M.MapData;
  for (const p of entries) {
    if (p.Key !== undefined && SameValueZero(p.Key, key) === Value.true) {
      p.Value = value;
      return M;
    }
  }
  if (Type(key) === 'Number' && Object.is(key.numberValue(), -0)) {
    key = new Value(0);
  }
  const p = { Key: key, Value: value };
  entries.push(p);
  return M;
}

function MapProto_sizeGetter(args, { thisValue }) {
  const M = thisValue;
  if (Type(M) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'get Map.prototype.size'));
  }
  if (!('MapData' in M)) {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'get Map.prototype.size'));
  }
  const entries = M.MapData;
  let count = 0;
  for (const p of entries) {
    if (p.Key !== undefined) {
      count += 1;
    }
  }
  return new Value(count);
}

function MapProto_values(args, { thisValue }) {
  const M = thisValue;
  return Q(CreateMapIterator(M, 'value'));
}

export function CreateMapPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['clear', MapProto_clear, 0],
    ['delete', MapProto_delete, 1],
    ['entries', MapProto_entries, 0],
    ['forEach', MapProto_forEach, 1],
    ['get', MapProto_get, 1],
    ['has', MapProto_has, 1],
    ['keys', MapProto_keys, 0],
    ['set', MapProto_set, 2],
    ['size', [MapProto_sizeGetter]],
    ['values', MapProto_values, 0],
  ], realmRec.Intrinsics['%ObjectPrototype%'], 'Map');

  const entriesFunc = X(proto.GetOwnProperty(new Value('entries')));
  X(proto.DefineOwnProperty(wellKnownSymbols.iterator, entriesFunc));

  realmRec.Intrinsics['%MapPrototype%'] = proto;
}
