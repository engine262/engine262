import { surroundingAgent } from '../engine.mts';
import {
  BooleanValue,
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
  type ExpressionCompletion,
  type PlainCompletion,
  ThrowCompletion,
} from '../completion.mts';
import { __ts_cast__, type Mutable } from '../helpers.mts';
import type { AsyncFromSyncIteratorObject } from '../intrinsics/AsyncFromSyncIteratorPrototype.mts';
import type { YieldEvaluator } from '../evaluator.mts';
import {
  Assert,
  Call,
  CreateBuiltinFunction,
  CreateDataProperty,
  Get,
  GetMethod,
  GetV,
  PromiseResolve,
  OrdinaryObjectCreate,
  PerformPromiseThen,
  ToBoolean,
  Yield,
  CreateIteratorFromClosure,
  type FunctionObject,
  PromiseCapabilityRecord,
} from './all.mts';
import type { PromiseObject } from '#self';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-operations-on-iterator-objects */
// and
/** https://tc39.es/ecma262/#sec-iteration */

export interface IteratorRecord {
  Iterator: ObjectValue;
  NextMethod: Value;
  Done: BooleanValue;
}
/** https://tc39.es/ecma262/#sec-getiterator */
export function GetIterator(obj: Value, hint: 'sync' | 'async', method?: ObjectValue | UndefinedValue): PlainCompletion<IteratorRecord> {
  if (!hint) {
    hint = 'sync';
  }
  Assert(hint === 'sync' || hint === 'async');
  if (!method) {
    if (hint === 'async') {
      method = Q(GetMethod(obj, wellKnownSymbols.asyncIterator));
      if (method === Value.undefined) {
        const syncMethod = Q(GetMethod(obj, wellKnownSymbols.iterator));
        const syncIteratorRecord = Q(GetIterator(obj, 'sync', syncMethod));
        return Q(CreateAsyncFromSyncIterator(syncIteratorRecord));
      }
    } else {
      method = Q(GetMethod(obj, wellKnownSymbols.iterator));
    }
  }
  const iterator = Q(Call(method, obj));
  if (!(iterator instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', iterator);
  }
  const nextMethod = Q(GetV(iterator, Value('next')));
  const iteratorRecord: IteratorRecord = {
    Iterator: iterator,
    NextMethod: nextMethod,
    Done: Value.false,
  };
  return EnsureCompletion(iteratorRecord);
}

/** https://tc39.es/ecma262/#sec-iteratornext */
export function IteratorNext(iteratorRecord: IteratorRecord, value?: Value): ExpressionCompletion<ObjectValue> {
  let result;
  if (!value) {
    result = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator));
  } else {
    result = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, [value]));
  }
  if (!(result instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', result);
  }
  return result;
}

/** https://tc39.es/ecma262/#sec-iteratorcomplete */
export function IteratorComplete(iterResult: ObjectValue): ExpressionCompletion<BooleanValue> {
  Assert(iterResult instanceof ObjectValue);
  return ToBoolean(Q(Get(iterResult, Value('done'))));
}

/** https://tc39.es/ecma262/#sec-iteratorvalue */
export function IteratorValue(iterResult: ObjectValue): ExpressionCompletion {
  Assert(iterResult instanceof ObjectValue);
  return EnsureCompletion(Q(Get(iterResult, Value('value'))));
}

/** https://tc39.es/ecma262/#sec-iteratorstep */
export function IteratorStep(iteratorRecord: IteratorRecord): ExpressionCompletion<ObjectValue | BooleanValue<false>> {
  const result = Q(IteratorNext(iteratorRecord));
  const done = Q(IteratorComplete(result));
  if (done === Value.true) {
    return NormalCompletion(Value.false);
  }
  return NormalCompletion(result);
}

/** https://tc39.es/ecma262/#sec-iteratorclose */
export function IteratorClose<T, C extends Completion<T>>(iteratorRecord: IteratorRecord, completion: C | T): C | ThrowCompletion {
  // 1. Assert: Type(iteratorRecord.[[Iterator]]) is Object.
  Assert(iteratorRecord.Iterator instanceof ObjectValue);
  // 2. Assert: completion is a Completion Record.
  // TODO: completion should be a Completion Record so this should not be necessary
  Assert(completion instanceof Completion);
  // 3. Let iterator be iteratorRecord.[[Iterator]].
  const iterator = iteratorRecord.Iterator;
  // 4. Let innerResult be GetMethod(iterator, "return").
  let innerResult: ExpressionCompletion = EnsureCompletion(GetMethod(iterator, Value('return')));
  // 5. If innerResult.[[Type]] is normal, then
  if (innerResult.Type === 'normal') {
    // a. Let return be innerResult.[[Value]].
    const ret = innerResult.Value;
    // b. If return is undefined, return Completion(completion).
    if (ret === Value.undefined) {
      return completion;
    }
    // c. Set innerResult to Call(return, iterator).
    innerResult = Call(ret, iterator);
  }
  // 6. If completion.[[Type]] is throw, return Completion(completion).
  if (completion.Type === 'throw') {
    return Completion(completion);
  }
  // 7. If innerResult.[[Type]] is throw, return Completion(innerResult).
  if (innerResult.Type === 'throw') {
    return Completion(innerResult);
  }
  // 8. If Type(innerResult.[[Value]]) is not Object, throw a TypeError exception.
  if (!(innerResult.Value instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult.Value);
  }
  // 9. Return Completion(completion).
  return completion;
}

/** https://tc39.es/ecma262/#sec-asynciteratorclose */
export function* AsyncIteratorClose<T, C extends Completion<T>>(iteratorRecord: IteratorRecord, completion: C | T) {
  // 1. Assert: Type(iteratorRecord.[[Iterator]]) is Object.
  Assert(iteratorRecord.Iterator instanceof ObjectValue);
  // 2. Assert: completion is a Completion Record.
  Assert(completion instanceof Completion);
  // 3. Let iterator be iteratorRecord.[[Iterator]].
  const iterator = iteratorRecord.Iterator;
  // 4. Let innerResult be GetMethod(iterator, "return").
  let innerResult: ExpressionCompletion = EnsureCompletion(GetMethod(iterator, Value('return')));
  // 5. If innerResult.[[Type]] is normal, then
  if (innerResult.Type === 'normal') {
    // a. Let return be innerResult.[[Value]].
    const ret = innerResult.Value;
    // b. If return is undefined, return Completion(completion).
    if (ret === Value.undefined) {
      return Completion(completion);
    }
    // c. Set innerResult to Call(return, iterator).
    innerResult = Call(ret, iterator);
    // d. If innerResult.[[Type]] is normal, set innerResult to Await(innerResult.[[Value]]).
    if (innerResult.Type === 'normal') {
      innerResult = EnsureCompletion(yield* Await(innerResult.Value));
    }
  }
  // 6. If completion.[[Type]] is throw, return Completion(completion).
  if (completion.Type === 'throw') {
    return Completion(completion);
  }
  // 7. If innerResult.[[Type]] is throw, return Completion(innerResult).
  if (innerResult.Type === 'throw') {
    return Completion(innerResult);
  }
  // 8. If Type(innerResult.[[Value]]) is not Object, throw a TypeError exception.
  if (!(innerResult.Value instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult.Value);
  }
  // 9. Return Completion(completion).
  return Completion(completion);
}

/** https://tc39.es/ecma262/#sec-createiterresultobject */
export function CreateIterResultObject(value: Value, done: BooleanValue) {
  Assert(done instanceof BooleanValue);
  const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  X(CreateDataProperty(obj, Value('value'), value));
  X(CreateDataProperty(obj, Value('done'), done));
  return obj;
}

/** https://tc39.es/ecma262/#sec-createlistiteratorRecord */
export function CreateListIteratorRecord(list: Iterable<Value>): IteratorRecord {
  // 1. Let closure be a new Abstract Closure with no parameters that captures list and performs the following steps when called:
  const closure = function* closure(): YieldEvaluator {
    // a. For each element E of list, do
    for (const E of list) {
      // i. Perform ? Yield(E).
      Q(yield* Yield(E));
    }
    // b. Return undefined.
    return NormalCompletion(Value.undefined);
  };
  // 2. Let iterator be ! CreateIteratorFromClosure(closure, empty, %IteratorPrototype%).
  const iterator = X(CreateIteratorFromClosure(closure, undefined, surroundingAgent.intrinsic('%IteratorPrototype%')));
  // 3. Return Record { [[Iterator]]: iterator, [[NextMethod]]: %GeneratorFunction.prototype.prototype.next%, [[Done]]: false }.
  return {
    Iterator: iterator,
    NextMethod: surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype.next%'),
    Done: Value.false,
  };
}

/** https://tc39.es/ecma262/#sec-createasyncfromsynciterator */
export function CreateAsyncFromSyncIterator(syncIteratorRecord: IteratorRecord) {
  const asyncIterator = X(OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncFromSyncIteratorPrototype%'), [
    'SyncIteratorRecord',
  ])) as Mutable<AsyncFromSyncIteratorObject>;
  asyncIterator.SyncIteratorRecord = syncIteratorRecord;
  const nextMethod = X(Get(asyncIterator, Value('next')));
  return {
    Iterator: asyncIterator,
    NextMethod: nextMethod,
    Done: Value.false,
  };
}

/** https://tc39.es/ecma262/#sec-asyncfromsynciteratorcontinuation */
export function AsyncFromSyncIteratorContinuation(result: ObjectValue, promiseCapability: PromiseCapabilityRecord) {
  // 1. Let done be IteratorComplete(result).
  const done = IteratorComplete(result);
  // 2. IfAbruptRejectPromise(done, promiseCapability).
  IfAbruptRejectPromise(done, promiseCapability);
  // 3. Let value be IteratorValue(result).
  let value = IteratorValue(result);
  // 4. IfAbruptRejectPromise(value, promiseCapability).
  IfAbruptRejectPromise(value, promiseCapability);
  value = Q(value);
  // 5. Let valueWrapper be PromiseResolve(%Promise%, value).
  const valueWrapper = PromiseResolve(surroundingAgent.intrinsic('%Promise%') as FunctionObject, value);
  // 6. IfAbruptRejectPromise(valueWrapper, promiseCapability).
  IfAbruptRejectPromise(valueWrapper, promiseCapability);
  __ts_cast__<PromiseObject>(valueWrapper);
  // 7. Let unwrap be a new Abstract Closure with parameters (value) that captures done and performs the following steps when called:
  // eslint-disable-next-line arrow-body-style
  const unwrap = ([valueInner = Value.undefined]: Arguments) => {
    // a. Return ! CreateIterResultObject(value, done).
    return X(CreateIterResultObject(valueInner, X(done)));
  };
  // 8. Let onFulfilled be ! CreateBuiltinFunction(unwrap, 1, "", « »).
  const onFulfilled = X(CreateBuiltinFunction(unwrap, 1, Value(''), ['Done']));
  // 9. NOTE: onFulfilled is used when processing the "value" property of an IteratorResult object in order to wait for its value if it is a promise and re-package the result in a new "unwrapped" IteratorResult object.
  // 10. Perform ! PerformPromiseThen(valueWrapper, onFulfilled, undefined, promiseCapability).
  X(PerformPromiseThen(valueWrapper, onFulfilled, Value.undefined, promiseCapability));
  // 11. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}
