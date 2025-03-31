import { surroundingAgent } from '../host-defined/engine.mts';
import {
  Call,
  F,
  IsCallable,
  RequireInternalSlot,
  Get,
  ToNumber,
  ToIntegerOrInfinity,
  IteratorStep,
  IteratorValue,
  OrdinaryObjectCreate,
  SameValueZero, R,
  Realm,
} from '../abstract-ops/all.mts';
import {
  Descriptor,
  NumberValue,
  Value,
  wellKnownSymbols,
  ObjectValue,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  EnsureCompletion, Q, X, type ValueCompletion, type ValueEvaluator,
} from '../completion.mts';
import { __ts_cast__ } from '../helpers.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import { CreateSetIterator } from './SetIteratorPrototype.mts';
import type { SetObject } from './Set.mts';
import type {
  IteratorRecord, Mutable, PlainEvaluator,
} from '#self';

/** https://tc39.es/ecma262/#sec-set.prototype.add */
function SetProto_add([value = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Let S be the this value.
  const S = thisValue as SetObject;
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
  if (value instanceof NumberValue && Object.is(R(value), -0)) {
    value = F(+0);
  }
  // 6. Append value as the last element of entries.
  Q(surroundingAgent.debugger_tryTouchDuringPreview(S));
  entries.push(value);
  // 7. Return S.
  return S;
}

/** https://tc39.es/ecma262/#sec-set.prototype.clear */
function SetProto_clear(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Let S be the this value.
  const S = thisValue as SetObject;
  // 2. Perform ? RequireInternalSlot(S, [[SetData]]).
  Q(RequireInternalSlot(S, 'SetData'));
  // 3. Let entries be the List that is S.[[SetData]].
  const entries = S.SetData;
  // 4. For each e that is an element of entries, do
  if (entries.length) {
    Q(surroundingAgent.debugger_tryTouchDuringPreview(S));
  }
  for (let i = 0; i < entries.length; i += 1) {
    // a. Replace the element of entries whose value is e with an element whose value is empty.
    entries[i] = undefined;
  }
  // 5. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-set.prototype.delete */
function SetProto_delete([value = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Let S be the this value.
  const S = thisValue as SetObject;
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
      Q(surroundingAgent.debugger_tryTouchDuringPreview(S));
      entries[i] = undefined;
      // ii. Return true.
      return Value.true;
    }
  }
  // 5. Return false.
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-set.prototype.entries */
function SetProto_entries(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Let S be the this value.
  const S = thisValue;
  // 2. Return ? CreateSetIterator(S, key+value).
  return Q(CreateSetIterator(S, 'key+value'));
}

/** https://tc39.es/ecma262/#sec-set.prototype.foreach */
function* SetProto_forEach([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let S be the this value.
  const S = thisValue as SetObject;
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
      Q(yield* Call(callbackfn, thisArg, [e, e, S]));
    }
  }
  // 6. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-set.prototype.has */
function SetProto_has([value = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Let S be the this value.
  const S = thisValue as SetObject;
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

/** https://tc39.es/ecma262/#sec-get-set.prototype.size */
function SetProto_sizeGetter(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Let S be the this value.
  const S = thisValue as SetObject;
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

/** https://tc39.es/ecma262/#sec-set.prototype.values */
function SetProto_values(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Let S be the this value.
  const S = thisValue;
  // 2. Return ? CreateSetIterator(S, value).
  return Q(CreateSetIterator(S, 'value'));
}

/** https://tc39.es/ecma262/#sec-set.prototype.union */
function* SetProto_union([other = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;

  // 2. Perform ? RequireInternalSlot(O, [[SetData]]).
  Q(RequireInternalSlot(O, 'SetData'));
  __ts_cast__<SetObject>(O);

  // 3. Let otherRec be ? GetSetRecord(other).
  const otherRec = Q(yield* GetSetRecord(other));

  // 4. Let keysIter be ? GetKeysIterator(otherRec).
  const keysIter = Q(yield* GetKeysIterator(otherRec));

  // 5. Let resultSetData be a copy of O.[[SetData]].
  const resultSetData = [...O.SetData];

  // 6. Let next be true.
  let next: Value | 'done' = Value.true;

  // 7. Repeat, while next is not DONE,
  while (next !== 'done') {
    // a. Set next to ? IteratorStep(keysIter).
    next = Q(yield* IteratorStep(keysIter));

    // b. If next is not DONE, then
    if (next !== 'done') {
      // i. Let nextValue be ? IteratorValue(next).
      let nextValue = Q(yield* IteratorValue(next));

      // ii. If nextValue is -0𝔽, set nextValue to +0𝔽.
      if (nextValue instanceof NumberValue && Object.is(R(nextValue), -0)) {
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
  const result = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Set.prototype%'), ['SetData']) as Mutable<SetObject>;

  // 9. Set result.[[SetData]] to resultSetData.
  result.SetData = resultSetData;

  // 10. Return result.
  return EnsureCompletion(result);
}

export function bootstrapSetPrototype(realmRec: Realm) {
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

  const valuesFunc = X(proto.GetOwnProperty(Value('values'))) as Descriptor;
  X(proto.DefineOwnProperty(Value('keys'), valuesFunc));
  X(proto.DefineOwnProperty(wellKnownSymbols.iterator, valuesFunc));

  realmRec.Intrinsics['%Set.prototype%'] = proto;
}

interface SetRecord {
  readonly Set: ObjectValue;
  readonly Size: number;
  readonly Has: Value;
  readonly Keys: Value;
}

/** https://tc39.es/ecma262/#sec-getsetrecord */
function* GetSetRecord(obj: Value): PlainEvaluator<SetRecord> {
  // 1. If obj is not an Object, throw a TypeError exception.
  if (!(obj instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', obj);
  }

  // 2. Let rawSize be ? Get(obj, "size").
  const rawSize = Q(yield* Get(obj, Value('size')));

  // 3. Let numSize be ? ToNumber(rawSize).
  // 4. NOTE: If rawSize is undefined, then numSize will be NaN.
  const numSize = Q(yield* ToNumber(rawSize));

  // 5. If numSize is NaN, throw a TypeError exception.
  if (numSize.isNaN()) {
    return surroundingAgent.Throw('TypeError', 'SizeIsNaN');
  }

  // 6. Let intSize be ! ToIntegerOrInfinity(numSize).
  const intSize = X(ToIntegerOrInfinity(numSize));

  // 7. Let has be ? Get(obj, "has").
  const has = Q(yield* Get(obj, Value('has')));

  // 8. If IsCallable(has) is false, throw a TypeError exception.
  if (IsCallable(has) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', has);
  }

  // 9. Let keys be ? Get(obj, "keys").
  const keys = Q(yield* Get(obj, Value('keys')));

  // 10. If IsCallable(keys) is false, throw a TypeError exception.
  if (IsCallable(keys) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', keys);
  }

  // 11. Return a new Set Record { [[Set]]: obj, [[Size]]: intSize, [[Has]]: has, [[Keys]]: keys }.
  const setRecord: SetRecord = {
    Set: obj,
    Size: intSize,
    Has: has,
    Keys: keys,
  };

  return EnsureCompletion(setRecord);
}

/** https://tc39.es/proposal-set-methods/#sec-getkeysiterator */
function* GetKeysIterator(setRec: SetRecord): PlainEvaluator<IteratorRecord> {
  // 1. Let keysIter be ? Call(setRec.[[Keys]], setRec.[[Set]]).
  const keysIter = Q(Call(setRec.Keys, setRec.Set));

  // 2. If keysIter is not an Object, throw a TypeError exception.
  if (!(keysIter instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', keysIter);
  }

  // 3. Let nextMethod be ? Get(keysIter, "next").
  const nextMethod = Q(yield* Get(keysIter, Value('next')));

  // 4. If IsCallable(nextMethod) is false, throw a TypeError exception.
  if (IsCallable(nextMethod) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', nextMethod);
  }

  // 5. Return a new Iterator Record { [[Iterator]]: keysIter, [[NextMethod]]: nextMethod, [[Done]]: false }.
  const iteratorRecord: IteratorRecord = {
    Iterator: keysIter,
    NextMethod: nextMethod,
    Done: Value.false,
  };

  return EnsureCompletion(iteratorRecord);
}

/** https://tc39.es/ecma262/#sec-setdatahas */
function SetDataHas(resultSetData: (Value | undefined)[], value: Value) {
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
