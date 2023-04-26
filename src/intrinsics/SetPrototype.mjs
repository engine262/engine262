import { surroundingAgent } from '../engine.mjs';
import {
  Call,
  F,
  IsCallable,
  RequireInternalSlot,
  SameValueZero,
  Get,
  ToNumber,
  ToIntegerOrInfinity,
  IteratorStep,
  IteratorValue,
  OrdinaryObjectCreate,
} from '../abstract-ops/all.mjs';
import {
  NumberValue,
  Value,
  wellKnownSymbols,
  ObjectValue,
} from '../value.mjs';
import { EnsureCompletion, Q, X } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';
import { CreateSetIterator } from './SetIteratorPrototype.mjs';

/** http://tc39.es/ecma262/#sec-set.prototype.add */
function SetProto_add([value = Value.undefined], { thisValue }) {
  // 1. Let S be the this value.
  const S = thisValue;
  // 2. Perform ? RequireInternalSlot(S, [[SetData]]).
  Q(RequireInternalSlot(S, 'SetData'));
  // 3. Let entries be the List that is S.[[SetData]].
  const entries = S.SetData;
  // 4. For each e that is an element of entries, do
  for (const e of entries) {
    // a. For each e that is an element of entries, do
    if (e !== undefined && SameValueZero(e, value) === Value.true) {
      // i. Return S.
      return S;
    }
  }
  // 5. If value is -0𝔽, set value to +0𝔽.
  if (value instanceof NumberValue && Object.is(value.numberValue(), -0)) {
    value = F(+0);
  }
  // 6. Append value as the last element of entries.
  entries.push(value);
  // 7. Return S.
  return S;
}

/** http://tc39.es/ecma262/#sec-set.prototype.clear */
function SetProto_clear(args, { thisValue }) {
  // 1. Let S be the this value.
  const S = thisValue;
  // 2. Perform ? RequireInternalSlot(S, [[SetData]]).
  Q(RequireInternalSlot(S, 'SetData'));
  // 3. Let entries be the List that is S.[[SetData]].
  const entries = S.SetData;
  // 4. For each e that is an element of entries, do
  for (let i = 0; i < entries.length; i += 1) {
    // a. Replace the element of entries whose value is e with an element whose value is empty.
    entries[i] = undefined;
  }
  // 5. Return undefined.
  return Value.undefined;
}

/** http://tc39.es/ecma262/#sec-set.prototype.delete */
function SetProto_delete([value = Value.undefined], { thisValue }) {
  // 1. Let S be the this value.
  const S = thisValue;
  // 2. Perform ? RequireInternalSlot(S, [[SetData]]).
  Q(RequireInternalSlot(S, 'SetData'));
  // 3. Let entries be the List that is S.[[SetData]].
  const entries = S.SetData;
  // 4. For each e that is an element of entries, do
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    // a. If e is not empty and SameValueZero(e, value) is true, then
    if (e !== undefined && SameValueZero(e, value) === Value.true) {
      // i. Replace the element of entries whose value is e with an element whose value is empty.
      entries[i] = undefined;
      // ii. Return true.
      return Value.true;
    }
  }
  // 5. Return false.
  return Value.false;
}

/** http://tc39.es/ecma262/#sec-set.prototype.entries */
function SetProto_entries(args, { thisValue }) {
  // 1. Let S be the this value.
  const S = thisValue;
  // 2. Return ? CreateSetIterator(S, key+value).
  return Q(CreateSetIterator(S, 'key+value'));
}

/** http://tc39.es/ecma262/#sec-set.prototype.foreach */
function SetProto_forEach([callbackfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
  // 1. Let S be the this value.
  const S = thisValue;
  // 2. Perform ? RequireInternalSlot(S, [[SetData]]).
  Q(RequireInternalSlot(S, 'SetData'));
  // 3. If IsCallable(callbackfn) is false, throw a TypeError exception
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
  }
  // 4. Let entries be the List that is S.[[SetData]].
  const entries = S.SetData;
  // 5. For each element _e_ of _entries_, do
  for (const e of entries) {
    // a. If e is not empty, then
    if (e !== undefined) {
      // i. Perform ? Call(callbackfn, thisArg, « e, e, S »).
      Q(Call(callbackfn, thisArg, [e, e, S]));
    }
  }
  // 6. Return undefined.
  return Value.undefined;
}

/** http://tc39.es/ecma262/#sec-set.prototype.has */
function SetProto_has([value = Value.undefined], { thisValue }) {
  // 1. Let S be the this value.
  const S = thisValue;
  // 2. Perform ? RequireInternalSlot(S, [[SetData]]).
  Q(RequireInternalSlot(S, 'SetData'));
  // 3. Let entries be the List that is S.[[SetData]].
  const entries = S.SetData;
  // 4. Let entries be the List that is S.[[SetData]].
  for (const e of entries) {
    // a. If e is not empty and SameValueZero(e, value) is true, return true.
    if (e !== undefined && SameValueZero(e, value) === Value.true) {
      return Value.true;
    }
  }
  // 5. Return false.
  return Value.false;
}

/** http://tc39.es/ecma262/#sec-get-set.prototype.size */
function SetProto_sizeGetter(args, { thisValue }) {
  // 1. Let S be the this value.
  const S = thisValue;
  // 2. Perform ? RequireInternalSlot(S, [[SetData]]).
  Q(RequireInternalSlot(S, 'SetData'));
  // 3. Let entries be the List that is S.[[SetData]].
  const entries = S.SetData;
  // 4. Let count be 0.
  let count = 0;
  // 5. For each e that is an element of entries, do
  for (const e of entries) {
    // a. If e is not empty, set count to count + 1
    if (e !== undefined) {
      count += 1;
    }
  }
  // 6. Return 𝔽(count).
  return F(count);
}

/** http://tc39.es/ecma262/#sec-set.prototype.values */
function SetProto_values(args, { thisValue }) {
  // 1. Let S be the this value.
  const S = thisValue;
  // 2. Return ? CreateSetIterator(S, value).
  return Q(CreateSetIterator(S, 'value'));
}

/** http://tc39.es/ecma262/#sec-set.prototype.union */
function SetProto_union([other = Value.undefined], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;

  // 2. Perform ? RequireInternalSlot(O, [[SetData]]).
  Q(RequireInternalSlot(O, 'SetData'));

  // 3. Let otherRec be ? GetSetRecord(other).
  const otherRec = Q(GetSetRecord(other));

  // 4. Let keysIter be ? GetKeysIterator(otherRec).
  const keysIter = Q(GetKeysIterator(otherRec));

  // 5. Let resultSetData be a copy of O.[[SetData]].
  const resultSetData = [...O.SetData];

  // 6. Let next be true.
  let next = Value.true;

  // 7. Repeat, while next is not false,
  while (next !== Value.false) {
    // a. Set next to ? IteratorStep(keysIter).
    next = Q(IteratorStep(keysIter));

    // b. If next is not false, then
    if (next !== Value.false) {
      // i. Let nextValue be ? IteratorValue(next).
      let nextValue = Q(IteratorValue(next));

      // ii. If nextValue is -0𝔽, set nextValue to +0𝔽.
      if (nextValue instanceof NumberValue && Object.is(nextValue.numberValue(), -0)) {
        nextValue = F(+0);
      }

      // iii. If SetDataHas(resultSetData, nextValue) is false, then
      if (SetDataHas(resultSetData, nextValue) === Value.false) {
        // 1. Append nextValue to resultSetData.
        resultSetData.push(nextValue);
      }
    }
  }

  // 8. Let result be OrdinaryObjectCreate(%Set.prototype%, « [[SetData]] »).
  const result = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Set.prototype%'), ['SetData']);

  // 9. Set result.[[SetData]] to resultSetData.
  result.SetData = resultSetData;

  // 10. Return result.
  return EnsureCompletion(result);
}

export function bootstrapSetPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['add', SetProto_add, 1],
    ['clear', SetProto_clear, 0],
    ['delete', SetProto_delete, 1],
    ['entries', SetProto_entries, 0],
    ['forEach', SetProto_forEach, 1],
    ['has', SetProto_has, 1],
    ['size', [SetProto_sizeGetter]],
    ['values', SetProto_values, 0],
    ['union', SetProto_union, 1],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Set');

  const valuesFunc = X(proto.GetOwnProperty(new Value('values')));
  X(proto.DefineOwnProperty(new Value('keys'), valuesFunc));
  X(proto.DefineOwnProperty(wellKnownSymbols.iterator, valuesFunc));

  realmRec.Intrinsics['%Set.prototype%'] = proto;
}

/** GetSetRecord */
function GetSetRecord(obj) {
  // 1. If obj is not an Object, throw a TypeError exception.
  if (!(obj instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', obj);
  }

  // 2. Let rawSize be ? Get(obj, "size").
  const rawSize = Q(Get(obj, new Value('size')));

  // 3. Let numSize be ? ToNumber(rawSize).
  // 4. NOTE: If rawSize is undefined, then numSize will be NaN.
  const numSize = Q(ToNumber(rawSize));

  // 5. If numSize is NaN, throw a TypeError exception.
  if (numSize.isNaN()) {
    return surroundingAgent.Throw('TypeError', 'SizeIsNaN', numSize);
  }

  // 6. Let intSize be ! ToIntegerOrInfinity(numSize).
  const intSize = X(ToIntegerOrInfinity(numSize));

  // 7. Let has be ? Get(obj, "has").
  const has = Q(Get(obj, new Value('has')));

  // 8. If IsCallable(has) is false, throw a TypeError exception.
  if (IsCallable(has) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', has);
  }

  // 9. Let keys be ? Get(obj, "keys").
  const keys = Q(Get(obj, new Value('keys')));

  // 10. If IsCallable(keys) is false, throw a TypeError exception.
  if (!IsCallable(keys)) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', keys);
  }

  // 11. Return a new Set Record { [[Set]]: obj, [[Size]]: intSize, [[Has]]: has, [[Keys]]: keys }.
  const setRecord = {
    Set: obj,
    Size: intSize,
    Has: has,
    Keys: keys,
  };

  return EnsureCompletion(setRecord);
}

function GetKeysIterator(setRec) {
  // 1. Let keysIter be ? Call(setRec.[[Keys]], setRec.[[Set]]).
  const keysIter = Q(Call(setRec.Keys, setRec.Set));

  // 2. If keysIter is not an Object, throw a TypeError exception.
  if (!(keysIter instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', keysIter);
  }

  // 3. Let nextMethod be ? Get(keysIter, "next").
  const nextMethod = Q(Get(keysIter, new Value('next')));

  // 4. If IsCallable(nextMethod) is false, throw a TypeError exception.
  if (IsCallable(nextMethod) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', nextMethod);
  }

  // 5. Return a new Iterator Record { [[Iterator]]: keysIter, [[NextMethod]]: nextMethod, [[Done]]: false }.
  const iteratorRecord = {
    Iterator: keysIter,
    NextMethod: nextMethod,
    Done: Value.false,
  };

  return EnsureCompletion(iteratorRecord);
}

function SetDataHas(resultSetData, value) {
  // 1. For each element e of resultSetData, do
  for (const e of resultSetData) {
    // a. If e is not empty and SameValueZero(e, value) is true, return true.
    if (e !== undefined && SameValueZero(e, value) === Value.true) {
      return Value.true;
    }
  }

  // 2. Return false.
  return Value.false;
}
