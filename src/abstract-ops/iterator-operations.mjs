import { surroundingAgent } from '../engine.mjs';
import {
  BooleanValue,
  ObjectValue,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  Completion,
  EnsureCompletion,
  IfAbruptRejectPromise,
  Q, X,
  Await,
  NormalCompletion,
} from '../completion.mjs';
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
} from './all.mjs';

// This file covers abstract operations defined in
/** http://tc39.es/ecma262/#sec-operations-on-iterator-objects  */
// and
/** http://tc39.es/ecma262/#sec-iteration  */

/** http://tc39.es/ecma262/#sec-getiterator  */
export function GetIterator(obj, hint, method) {
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
  const nextMethod = Q(GetV(iterator, new Value('next')));
  const iteratorRecord = {
    Iterator: iterator,
    NextMethod: nextMethod,
    Done: Value.false,
  };
  return EnsureCompletion(iteratorRecord);
}

/** http://tc39.es/ecma262/#sec-iteratornext  */
export function IteratorNext(iteratorRecord, value) {
  let result;
  if (!value) {
    result = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator));
  } else {
    result = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, [value]));
  }
  if (!(result instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', result);
  }
  return EnsureCompletion(result);
}

/** http://tc39.es/ecma262/#sec-iteratorcomplete  */
export function IteratorComplete(iterResult) {
  Assert(iterResult instanceof ObjectValue);
  return EnsureCompletion(ToBoolean(Q(Get(iterResult, new Value('done')))));
}

/** http://tc39.es/ecma262/#sec-iteratorvalue  */
export function IteratorValue(iterResult) {
  Assert(iterResult instanceof ObjectValue);
  return EnsureCompletion(Q(Get(iterResult, new Value('value'))));
}

/** http://tc39.es/ecma262/#sec-iteratorstep  */
export function IteratorStep(iteratorRecord) {
  const result = Q(IteratorNext(iteratorRecord));
  const done = Q(IteratorComplete(result));
  if (done === Value.true) {
    return EnsureCompletion(Value.false);
  }
  return EnsureCompletion(result);
}

/** http://tc39.es/ecma262/#sec-iteratorclose  */
export function IteratorClose(iteratorRecord, completion) {
  // 1. Assert: Type(iteratorRecord.[[Iterator]]) is Object.
  Assert(iteratorRecord.Iterator instanceof ObjectValue);
  // 2. Assert: completion is a Completion Record.
  // TODO: completion should be a Completion Record so this should not be necessary
  completion = EnsureCompletion(completion);
  Assert(completion instanceof Completion);
  // 3. Let iterator be iteratorRecord.[[Iterator]].
  const iterator = iteratorRecord.Iterator;
  // 4. Let innerResult be GetMethod(iterator, "return").
  let innerResult = EnsureCompletion(GetMethod(iterator, new Value('return')));
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

/** http://tc39.es/ecma262/#sec-asynciteratorclose  */
export function* AsyncIteratorClose(iteratorRecord, completion) {
  // 1. Assert: Type(iteratorRecord.[[Iterator]]) is Object.
  Assert(iteratorRecord.Iterator instanceof ObjectValue);
  // 2. Assert: completion is a Completion Record.
  Assert(completion instanceof Completion);
  // 3. Let iterator be iteratorRecord.[[Iterator]].
  const iterator = iteratorRecord.Iterator;
  // 4. Let innerResult be GetMethod(iterator, "return").
  let innerResult = EnsureCompletion(GetMethod(iterator, new Value('return')));
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

/** http://tc39.es/ecma262/#sec-createiterresultobject  */
export function CreateIterResultObject(value, done) {
  Assert(done instanceof BooleanValue);
  const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  X(CreateDataProperty(obj, new Value('value'), value));
  X(CreateDataProperty(obj, new Value('done'), done));
  return obj;
}

/** http://tc39.es/ecma262/#sec-createlistiteratorRecord  */
export function CreateListIteratorRecord(list) {
  // 1. Let closure be a new Abstract Closure with no parameters that captures list and performs the following steps when called:
  const closure = function* closure() {
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

/** http://tc39.es/ecma262/#sec-createasyncfromsynciterator  */
export function CreateAsyncFromSyncIterator(syncIteratorRecord) {
  const asyncIterator = X(OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncFromSyncIteratorPrototype%'), [
    'SyncIteratorRecord',
  ]));
  asyncIterator.SyncIteratorRecord = syncIteratorRecord;
  const nextMethod = X(Get(asyncIterator, new Value('next')));
  return {
    Iterator: asyncIterator,
    NextMethod: nextMethod,
    Done: Value.false,
  };
}

/** http://tc39.es/ecma262/#sec-asyncfromsynciteratorcontinuation  */
export function AsyncFromSyncIteratorContinuation(result, promiseCapability) {
  // 1. Let done be IteratorComplete(result).
  const done = IteratorComplete(result);
  // 2. IfAbruptRejectPromise(done, promiseCapability).
  IfAbruptRejectPromise(done, promiseCapability);
  // 3. Let value be IteratorValue(result).
  const value = IteratorValue(result);
  // 4. IfAbruptRejectPromise(value, promiseCapability).
  IfAbruptRejectPromise(value, promiseCapability);
  // 5. Let valueWrapper be PromiseResolve(%Promise%, value).
  const valueWrapper = PromiseResolve(surroundingAgent.intrinsic('%Promise%'), value);
  // 6. IfAbruptRejectPromise(valueWrapper, promiseCapability).
  IfAbruptRejectPromise(valueWrapper, promiseCapability);
  // 7. Let unwrap be a new Abstract Closure with parameters (value) that captures done and performs the following steps when called:
  // eslint-disable-next-line arrow-body-style
  const unwrap = ([valueInner = Value.undefined]) => {
    // a. Return ! CreateIterResultObject(value, done).
    return X(CreateIterResultObject(valueInner, done));
  };
  // 8. Let onFulfilled be ! CreateBuiltinFunction(unwrap, 1, "", « »).
  const onFulfilled = X(CreateBuiltinFunction(unwrap, 1, new Value(''), ['Done']));
  // 9. NOTE: onFulfilled is used when processing the "value" property of an IteratorResult object in order to wait for its value if it is a promise and re-package the result in a new "unwrapped" IteratorResult object.
  // 10. Perform ! PerformPromiseThen(valueWrapper, onFulfilled, undefined, promiseCapability).
  X(PerformPromiseThen(valueWrapper, onFulfilled, Value.undefined, promiseCapability));
  // 11. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}
