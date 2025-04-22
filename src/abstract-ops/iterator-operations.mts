import { surroundingAgent } from '../host-defined/engine.mts';
import {
  BooleanValue,
  JSStringValue,
  ObjectValue,
  UndefinedValue,
  Value,
  wellKnownSymbols,
  type Arguments,
} from '../value.mts';
import {
  Completion,
  EnsureCompletion,
  IfAbruptRejectPromise,
  Q, X,
  Await,
  NormalCompletion,
  type ValueEvaluator,
  ThrowCompletion,
  AbruptCompletion,
} from '../completion.mts';
import { __ts_cast__, type Mutable } from '../helpers.mts';
import type { AsyncFromSyncIteratorObject } from '../intrinsics/AsyncFromSyncIteratorPrototype.mts';
import type {
  Evaluator, PlainEvaluator, YieldEvaluator,
} from '../evaluator.mts';
import {
  Assert,
  Call,
  CreateBuiltinFunction,
  Get,
  GetMethod,
  PromiseResolve,
  OrdinaryObjectCreate,
  PerformPromiseThen,
  ToBoolean,
  CreateIteratorFromClosure,
  type FunctionObject,
  PromiseCapabilityRecord,
  CreateDataPropertyOrThrow,
  GeneratorYield,
} from './all.mts';
import type { ValueCompletion, PromiseObject, OrdinaryObject } from '#self';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-operations-on-iterator-objects */
// and
/** https://tc39.es/ecma262/#sec-iteration */

export interface IteratorRecord {
  readonly Iterator: ObjectValue;
  readonly NextMethod: Value;
  Done: BooleanValue;
}

export interface IteratorObject extends OrdinaryObject {
  Iterated: IteratorRecord;
}

/** https://tc39.es/ecma262/#sec-getiteratordirect */
export function* GetIteratorDirect(obj: ObjectValue): PlainEvaluator<IteratorRecord> {
  const nextMethod = Q(yield* Get(obj, Value('next')));
  const iteratorRecord: IteratorRecord = {
    Iterator: obj,
    NextMethod: nextMethod,
    Done: Value.false,
  };
  return iteratorRecord;
}

/** https://tc39.es/ecma262/#sec-getiteratorfrommethod */
export function* GetIteratorFromMethod(obj: Value, method: FunctionObject): PlainEvaluator<IteratorRecord> {
  const iterator = Q(yield* Call(method, obj));
  if (!(iterator instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', iterator);
  }
  return yield* GetIteratorDirect(iterator);
}

/** https://tc39.es/ecma262/#sec-getiterator */
export function* GetIterator(obj: Value, kind: 'sync' | 'async'): PlainEvaluator<IteratorRecord> {
  let method;
  if (kind === 'async') {
    method = Q(yield* GetMethod(obj, wellKnownSymbols.asyncIterator));
    if (method === Value.undefined) {
      const syncMethod = Q(yield* GetMethod(obj, wellKnownSymbols.iterator));
      if (syncMethod instanceof UndefinedValue) {
        return surroundingAgent.Throw('TypeError', 'NotIterable', obj);
      }
      const syncIteratorRecord = Q(yield* GetIteratorFromMethod(obj, syncMethod));
      return CreateAsyncFromSyncIterator(syncIteratorRecord);
    }
  } else {
    method = Q(yield* GetMethod(obj, wellKnownSymbols.iterator));
  }
  if (method instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'NotIterable', obj);
  }
  return yield* GetIteratorFromMethod(obj, method);
}

export type PrimitiveHanding = 'iterate-string-primitives' | 'reject-primitives'
export function* GetIteratorFlattenable(obj: Value, primitiveHandling: PrimitiveHanding): PlainEvaluator<IteratorRecord> {
  if (!(obj instanceof ObjectValue)) {
    if (primitiveHandling === 'reject-primitives') {
      return surroundingAgent.Throw('TypeError', 'NotAnObject', obj);
    }
    Assert(primitiveHandling === 'iterate-string-primitives');
    if (!(obj instanceof JSStringValue)) {
      return surroundingAgent.Throw('TypeError', 'NotAString', obj);
    }
  }
  const method = Q(yield* GetMethod(obj, wellKnownSymbols.iterator));
  let iterator;
  if (method instanceof UndefinedValue) {
    iterator = obj;
  } else {
    iterator = Q(yield* Call(method, obj));
  }
  if (!(iterator instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', iterator);
  }
  return yield* GetIteratorDirect(iterator);
}

/** https://tc39.es/ecma262/#sec-iteratornext */
export function* IteratorNext(iteratorRecord: IteratorRecord, value?: Value): ValueEvaluator<ObjectValue> {
  let result;
  if (!value) {
    result = EnsureCompletion(yield* Call(iteratorRecord.NextMethod, iteratorRecord.Iterator));
  } else {
    result = EnsureCompletion(yield* Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, [value]));
  }
  if (result instanceof ThrowCompletion) {
    iteratorRecord.Done = Value.true;
    return Q(result);
  }
  result = X(result);
  if (!(result instanceof ObjectValue)) {
    iteratorRecord.Done = Value.true;
    return surroundingAgent.Throw('TypeError', 'NotAnObject', result);
  }
  return result;
}

/** https://tc39.es/ecma262/#sec-iteratorcomplete */
export function* IteratorComplete(iteratorResult: ObjectValue): ValueEvaluator<BooleanValue> {
  return ToBoolean(Q(yield* Get(iteratorResult, Value('done'))));
}

/** https://tc39.es/ecma262/#sec-iteratorvalue */
export function IteratorValue(iterResult: ObjectValue): ValueEvaluator {
  return Get(iterResult, Value('value'));
}

/** https://tc39.es/ecma262/#sec-iteratorstep */
export function* IteratorStep(iteratorRecord: IteratorRecord): PlainEvaluator<ObjectValue | 'done'> {
  const result = Q(yield* IteratorNext(iteratorRecord));
  let done: ValueCompletion = EnsureCompletion(yield* IteratorComplete(result));
  if (done instanceof ThrowCompletion) {
    iteratorRecord.Done = Value.true;
    return done;
  }
  done = X(done);
  if (done === Value.true) {
    iteratorRecord.Done = Value.true;
    return 'done';
  }
  return result;
}

/** https://tc39.es/ecma262/#sec-iteratorstepvalue */
export function* IteratorStepValue(iteratorRecord: IteratorRecord): PlainEvaluator<Value | 'done'> {
  const result = Q(yield* IteratorStep(iteratorRecord));
  if (result === 'done') {
    return 'done';
  }
  const value = EnsureCompletion(yield* IteratorValue(result));
  if (value instanceof ThrowCompletion) {
    iteratorRecord.Done = Value.true;
  }
  return value;
}

/** https://tc39.es/ecma262/#sec-iteratorclose */
export function* IteratorClose<T, C extends Completion<T>>(iteratorRecord: IteratorRecord, completion: C): Evaluator<C | ThrowCompletion> {
  Assert(iteratorRecord.Iterator instanceof ObjectValue);
  const iterator = iteratorRecord.Iterator;
  let innerResult: ValueCompletion = EnsureCompletion(yield* GetMethod(iterator, Value('return')));
  if (innerResult instanceof NormalCompletion) {
    const ret = innerResult.Value;
    if (ret === Value.undefined) {
      return completion;
    }
    innerResult = EnsureCompletion(yield* Call(ret, iterator));
  }
  if (completion instanceof ThrowCompletion) {
    return completion;
  }
  if (innerResult instanceof ThrowCompletion) {
    return innerResult;
  }
  if (!(innerResult.Value instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult.Value);
  }
  return completion;
}

/** https://tc39.es/ecma262/#sec-asynciteratorclose */
export function* AsyncIteratorClose<T, C extends Completion<T>>(iteratorRecord: IteratorRecord, completion: C | T) {
  Assert(iteratorRecord.Iterator instanceof ObjectValue);
  const iterator = iteratorRecord.Iterator;
  let innerResult: NormalCompletion<Value> | ThrowCompletion = EnsureCompletion(yield* GetMethod(iterator, Value('return')));
  if (innerResult instanceof NormalCompletion) {
    const ret = innerResult.Value;
    if (ret instanceof UndefinedValue) {
      return completion;
    }
    innerResult = EnsureCompletion(yield* Call(ret, iterator));
    if (innerResult instanceof NormalCompletion) {
      innerResult = EnsureCompletion(yield* Await(innerResult.Value));
    }
  }
  if (completion instanceof ThrowCompletion) {
    return completion;
  }
  if (innerResult instanceof ThrowCompletion) {
    return innerResult;
  }
  if (!(innerResult.Value instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult.Value);
  }
  return completion;
}

/** https://tc39.es/ecma262/#sec-createiterresultobject */
export function CreateIteratorResultObject(value: Value, done: BooleanValue) {
  const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  X(CreateDataPropertyOrThrow(obj, Value('value'), value));
  X(CreateDataPropertyOrThrow(obj, Value('done'), done));
  return obj;
}

/** https://tc39.es/ecma262/#sec-createlistiteratorRecord */
export function CreateListIteratorRecord(list: Iterable<Value>): IteratorRecord {
  const closure = function* closure(): YieldEvaluator {
    for (const E of list) {
      Q(yield* GeneratorYield(CreateIteratorResultObject(E, Value.false)));
    }
    return NormalCompletion(Value.undefined);
  };
  const iterator = CreateIteratorFromClosure(closure, undefined, surroundingAgent.intrinsic('%Iterator.prototype%'));
  return {
    Iterator: iterator,
    NextMethod: surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype.next%'),
    Done: Value.false,
  };
}

/** https://tc39.es/ecma262/#sec-iteratortolist */
export function* IteratorToList(iteratorRecord: IteratorRecord): PlainEvaluator<Value[]> {
  const list: Value[] = [];
  while (true) {
    const next = Q(yield* IteratorStepValue(iteratorRecord));
    if (next === 'done') {
      return list;
    }
    list.push(next);
  }
}

/** https://tc39.es/ecma262/#sec-createasyncfromsynciterator */
export function CreateAsyncFromSyncIterator(syncIteratorRecord: IteratorRecord) {
  const asyncIterator = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncFromSyncIteratorPrototype%'), [
    'SyncIteratorRecord',
  ]) as Mutable<AsyncFromSyncIteratorObject>;
  asyncIterator.SyncIteratorRecord = syncIteratorRecord;
  const nextMethod = X(Get(asyncIterator, Value('next')));
  return {
    Iterator: asyncIterator,
    NextMethod: nextMethod,
    Done: Value.false,
  };
}

/** https://tc39.es/ecma262/#sec-asyncfromsynciteratorcontinuation */
export function* AsyncFromSyncIteratorContinuation(result: ObjectValue, promiseCapability: PromiseCapabilityRecord, syncIteratorRecord: IteratorRecord, closeOnRejection: BooleanValue): ValueEvaluator<PromiseObject> {
  const done = yield* IteratorComplete(result);
  IfAbruptRejectPromise(done, promiseCapability);
  __ts_cast__<BooleanValue>(done);
  const value = yield* IteratorValue(result);
  IfAbruptRejectPromise(value, promiseCapability);
  __ts_cast__<Value>(value);
  let valueWrapper = yield* PromiseResolve(surroundingAgent.intrinsic('%Promise%'), value);
  if (valueWrapper instanceof AbruptCompletion && done === Value.false && closeOnRejection === Value.true) {
    valueWrapper = yield* IteratorClose(syncIteratorRecord, valueWrapper);
  }
  IfAbruptRejectPromise(valueWrapper, promiseCapability);
  __ts_cast__<PromiseObject>(valueWrapper);
  const unwrap = ([v]: Arguments) => CreateIteratorResultObject(v, done);
  const onFullfilled = CreateBuiltinFunction(unwrap, 1, Value(''), []);
  let onRejected;
  if (done === Value.true || closeOnRejection === Value.false) {
    onRejected = Value.undefined;
  } else {
    const closeIterator = ([error]: Arguments) => IteratorClose(syncIteratorRecord, ThrowCompletion(error));
    onRejected = CreateBuiltinFunction(closeIterator, 1, Value(''), []);
  }
  PerformPromiseThen(valueWrapper, onFullfilled, onRejected, promiseCapability);
  return promiseCapability.Promise;
}
