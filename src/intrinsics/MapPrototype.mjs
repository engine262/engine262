import { surroundingAgent } from '../engine.mjs';
import {
  Call,
  IsCallable,
  OrdinaryObjectCreate,
  SameValueZero,
  RequireInternalSlot,
  F,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';


function CreateMapIterator(map, kind) {
  Q(RequireInternalSlot(map, 'MapData'));
  const iterator = OrdinaryObjectCreate(surroundingAgent.intrinsic('%MapIteratorPrototype%'), [
    'IteratedMap',
    'MapNextIndex',
    'MapIterationKind',
  ]);
  iterator.IteratedMap = map;
  iterator.MapNextIndex = 0;
  iterator.MapIterationKind = kind;
  return iterator;
}

// #sec-map.prototype.clear
function MapProto_clear(args, { thisValue }) {
  // 1. Let M be the this value.
  const M = thisValue;
  // 2. Perform ? RequireInternalSlot(M, [[MapData]]).
  Q(RequireInternalSlot(M, 'MapData'));
  // 3. Let entries be the List that is M.[[MapData]].
  const entries = M.MapData;
  // 4. For each Record { [[Key]], [[Value]] } p that is an element of entries, do
  for (const p of entries) {
    // a. Set p.[[Key]] to empty.
    p.Key = undefined;
    // b. Set p.[[Value]] to empty.
    p.Value = undefined;
  }
  // 5. Return undefined.
  return Value.undefined;
}

// #sec-map.prototype.delete
function MapProto_delete([key = Value.undefined], { thisValue }) {
  // 1. Let M be the this value.
  const M = thisValue;
  // 2. Perform ? RequireInternalSlot(M, [[MapData]]).
  Q(RequireInternalSlot(M, 'MapData'));
  // 3. Let entires be M.[[MapData]].
  const entries = M.MapData;
  // 4. For each Record { [[Key]], [[Value]] } p that is an element of entries, do
  for (const p of entries) {
    // a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true, then
    if (p.Key !== undefined && SameValueZero(p.Key, key) === Value.true) {
      // i. Set p.[[Key]] to empty.
      p.Key = undefined;
      // ii. Set p.[[Value]] to empty.
      p.Value = undefined;
      // iii. Return true.
      return Value.true;
    }
  }
  return Value.false;
}

// #sec-map.prototype.entries
function MapProto_entries(args, { thisValue }) {
  // 1. Let M be the this value.
  const M = thisValue;
  // 2. Return ? CreateMapIterator(M, key+value);
  return Q(CreateMapIterator(M, 'key+value'));
}

// #sec-map.prototype.foreach
function MapProto_forEach([callbackfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
  // 1. Let M be the this value.
  const M = thisValue;
  // 2. Perform ? RequireInternalSlot(M, [[MapData]]).
  Q(RequireInternalSlot(M, 'MapData'));
  // 3. If IsCallable(callbackfn) is false, throw a TypeError exception.
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
  }
  // 4. Let entries be the List that is M.[[MapData]].
  const entries = M.MapData;
  // 5. For each Record { [[Key]], [[Value]] } e that is an element of entries, in original key insertion order, do
  for (const e of entries) {
    // a. If e.[[Key]] is not empty, then
    if (e.Key !== undefined) {
      // i. Perform ? Call(callbackfn, thisArg, « e.[[Value]], e.[[Key]], M »).
      Q(Call(callbackfn, thisArg, [e.Value, e.Key, M]));
    }
  }
  // 6. Return undefined.
  return Value.undefined;
}

// #sec-map.prototype.get
function MapProto_get([key = Value.undefined], { thisValue }) {
  // 1. Let M be the this value.
  const M = thisValue;
  // 2. Perform ? RequireInternalSlot(M, [[MapData]]).
  Q(RequireInternalSlot(M, 'MapData'));
  // 3. Let entries be the List that is M.[[MapData]].
  const entries = M.MapData;
  // 4. For each Record { [[Key]], [[Value]] } p that is an element of entries, do
  for (const p of entries) {
    // a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true, return p.[[Value]].
    if (p.Key !== undefined && SameValueZero(p.Key, key) === Value.true) {
      // i. Return p.[[Value]].
      return p.Value;
    }
  }
  // 5. Return undefined.
  return Value.undefined;
}

// #sec-map.prototype.has
function MapProto_has([key = Value.undefined], { thisValue }) {
  // 1. Let M be the this value.
  const M = thisValue;
  // 2. Perform ? RequireInternalSlot(M, [[MapData]]).
  Q(RequireInternalSlot(M, 'MapData'));
  // 3. Let entries be the List that is M.[[MapData]].
  const entries = M.MapData;
  // 4. For each Record { [[Key]], [[Value]] } p that is an element of entries, do
  for (const p of entries) {
    // a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true, return true.
    if (p.Key !== undefined && SameValueZero(p.Key, key) === Value.true) {
      return Value.true;
    }
  }
  // 5. Return false.
  return Value.false;
}

// #sec-map.prototype.keys
function MapProto_keys(args, { thisValue }) {
  // 1. Let M be the this value.
  const M = thisValue;
  // 2. Return ? CreateMapIterator(M, key).
  return Q(CreateMapIterator(M, 'key'));
}

// #sec-map.prototype.set
function MapProto_set([key = Value.undefined, value = Value.undefined], { thisValue }) {
  // 1. Let M be the this value.
  const M = thisValue;
  // 2. Perform ? RequireInternalSlot(M, [[MapData]]).
  Q(RequireInternalSlot(M, 'MapData'));
  // 3. Let entries be the List that is M.[[MapData]].
  const entries = M.MapData;
  // 4. For each Record { [[Key]], [[Value]] } p that is an element of entries, do
  for (const p of entries) {
    // a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true, then
    if (p.Key !== undefined && SameValueZero(p.Key, key) === Value.true) {
      // i. Set p.[[Value]] to value.
      p.Value = value;
      // ii. Return M.
      return M;
    }
  }
  // 5. If key is -0𝔽, set key to +0𝔽.
  if (Type(key) === 'Number' && Object.is(key.numberValue(), -0)) {
    key = F(+0);
  }
  // 6. Let p be the Record { [[Key]]: key, [[Value]]: value }.
  const p = { Key: key, Value: value };
  // 7. Append p as the last element of entries.
  entries.push(p);
  // 8. Return M.
  return M;
}

// #sec-get-map.prototype.size
function MapProto_sizeGetter(args, { thisValue }) {
  // 1. Let M be the this value.
  const M = thisValue;
  // 2. Perform ? RequireInternalSlot(M, [[MapData]]).
  Q(RequireInternalSlot(M, 'MapData'));
  // 3. Let entries be the List that is M.[[MapData]].
  const entries = M.MapData;
  // 4. Let count be 0.
  let count = 0;
  // 5. For each Record { [[Key]], [[Value]] } p that is an element of entries, do
  for (const p of entries) {
    // a. If p.[[Key]] is not empty, set count to count + 1.
    if (p.Key !== undefined) {
      count += 1;
    }
  }
  // 6. Return 𝔽(count).
  return F(count);
}

// #sec-map.prototype.values
function MapProto_values(args, { thisValue }) {
  // 1. Let M be the this value.
  const M = thisValue;
  // 2. Return ? CreateMapIterator(M, value).
  return Q(CreateMapIterator(M, 'value'));
}

export function bootstrapMapPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
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
  ], realmRec.Intrinsics['%Object.prototype%'], 'Map');

  const entriesFunc = X(proto.GetOwnProperty(new Value('entries')));
  X(proto.DefineOwnProperty(wellKnownSymbols.iterator, entriesFunc));

  realmRec.Intrinsics['%Map.prototype%'] = proto;
}
