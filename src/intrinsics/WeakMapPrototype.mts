import { surroundingAgent } from '../engine.mts';
import {
  SameValue,
  RequireInternalSlot,
  CanBeHeldWeakly,
  Realm,
} from '../abstract-ops/all.mts';
import {
  Value,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import { Q, type ExpressionCompletion } from '../completion.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import type { WeakMapObject } from './WeakMap.mts';

/** https://tc39.es/ecma262/#sec-weakmap.prototype.delete */
function WeakMapProto_delete([key = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  // 1. Let M be the this value.
  const M = thisValue as WeakMapObject;
  // 2. Perform ? RequireInternalSlot(M, [[WeakMapData]]).
  Q(RequireInternalSlot(M, 'WeakMapData'));
  // 3. If CanBeHeldWeakly(key) is false, return false.
  if (CanBeHeldWeakly(key) === Value.false) {
    return Value.false;
  }
  // 4. For each Record { [[Key]], [[Value]] } p that is an element of entries, do
  const entries = M.WeakMapData;
  for (let i = 0; i < entries.length; i += 1) {
    const p = entries[i];
    // a. If p.[[Key]] is not empty and SameValue(p.[[Key]], key) is true, then
    if (p.Key !== undefined && SameValue(p.Key, key) === Value.true) {
      // i. Set p.[[Key]] to empty.
      Q(surroundingAgent.debugger_tryTouchDuringPreview(M));
      p.Key = undefined;
      // ii. Set p.[[Value]] to empty.
      p.Value = undefined;
      // iii. return true.
      return Value.true;
    }
  }
  // 5. Return false.
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-weakmap.prototype.get */
function WeakMapProto_get([key = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  // 1. Let m be the this value.
  const M = thisValue as WeakMapObject;
  // 2. Perform ? RequireInternalSlot(M, [[WeakMapData]]).
  Q(RequireInternalSlot(M, 'WeakMapData'));
  // 3. If CanBeHeldWeakly(key) is false, return false.
  if (CanBeHeldWeakly(key) === Value.false) {
    return Value.undefined;
  }
  // 4. For each Record { [[Key]], [[Value]] } p of M.[[WeakMapData]], do
  const entries = M.WeakMapData;
  for (const p of entries) {
    // a. If p.[[Key]] is not empty and SameValue(p.[[Key]], key) is true, return p.[[Value]].
    if (p.Key !== undefined && SameValue(p.Key, key) === Value.true) {
      return p.Value!;
    }
  }
  // 6. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-weakmap.prototype.has */
function WeakMapProto_has([key = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  // 1. Let M be the this value.
  const M = thisValue as WeakMapObject;
  // 2. Perform ? RequireInternalSlot(M, [[WeakMapData]]).
  Q(RequireInternalSlot(M, 'WeakMapData'));
  // 3. If CanBeHeldWeakly(key) is false, return false.
  if (CanBeHeldWeakly(key) === Value.false) {
    return Value.false;
  }
  // 4. For each Record { [[Key]], [[Value]] } p of M.[[WeakMapData]], do
  const entries = M.WeakMapData;
  for (const p of entries) {
    // a. If p.[[Key]] is not empty and SameValue(p.[[Key]], key) is true, return true.
    if (p.Key !== undefined && SameValue(p.Key, key) === Value.true) {
      return Value.true;
    }
  }
  // 6. Return false.
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-weakmap.prototype.set */
function WeakMapProto_set([key = Value.undefined, value = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  // 1. Let M be the this value.
  const M = thisValue as WeakMapObject;
  // 2. Perform ? RequireInternalSlot(M, [[WeakMapData]]).
  Q(RequireInternalSlot(M, 'WeakMapData'));
  // 3. If CanBeHeldWeakly(key) is false, throw a TypeError exception.
  if (CanBeHeldWeakly(key) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'WeakCollectionNotObject', key);
  }
  // 4. For each Record { [[Key]], [[Value]] } p that is an element of entries, do
  const entries = M.WeakMapData;
  for (const p of entries) {
    // a. If p.[[Key]] is not empty and SameValue(p.[[Key]], key) is true, then
    if (p.Key !== undefined && SameValue(p.Key, key) === Value.true) {
      // i. Set p.[[Value]] to value.
      Q(surroundingAgent.debugger_tryTouchDuringPreview(M));
      p.Value = value;
      // ii. Return M.
      return M;
    }
  }
  // 5. Let p be the Record { [[Key]]: key, [[Value]]: value }.
  const p = { Key: key, Value: value };
  // 7. Append p as the last element of entries.
  entries.push(p);
  // 7. Return M.
  return M;
}

export function bootstrapWeakMapPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['delete', WeakMapProto_delete, 1],
    ['get', WeakMapProto_get, 1],
    ['has', WeakMapProto_has, 1],
    ['set', WeakMapProto_set, 2],
  ], realmRec.Intrinsics['%Object.prototype%'], 'WeakMap');

  realmRec.Intrinsics['%WeakMap.prototype%'] = proto;
}
