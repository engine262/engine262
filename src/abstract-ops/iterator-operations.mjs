import { surroundingAgent } from '../engine.mjs';
import {
  Type,
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
// 7.4 #sec-operations-on-iterator-objects
// and
// 25.1 #sec-iteration

// 7.4.1 #sec-getiterator
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
  if (Type(iterator) !== 'Object') {
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

// 7.4.2 #sec-iteratornext
export function IteratorNext(iteratorRecord, value) {
  let result;
  if (!value) {
    result = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator));
  } else {
    result = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, [value]));
  }
  if (Type(result) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', result);
  }
  return EnsureCompletion(result);
}

// 7.4.3 #sec-iteratorcomplete
export function IteratorComplete(iterResult) {
  Assert(Type(iterResult) === 'Object');
  return EnsureCompletion(ToBoolean(Q(Get(iterResult, new Value('done')))));
}

// 7.4.4 #sec-iteratorvalue
export function IteratorValue(iterResult) {
  Assert(Type(iterResult) === 'Object');
  return EnsureCompletion(Q(Get(iterResult, new Value('value'))));
}

// 7.4.5 #sec-iteratorstep
export function IteratorStep(iteratorRecord) {
  const result = Q(IteratorNext(iteratorRecord));
  const done = Q(IteratorComplete(result));
  if (done === Value.true) {
    return EnsureCompletion(Value.false);
  }
  return EnsureCompletion(result);
}

// #sec-iteratorclose
export function IteratorClose(iteratorRecord, completion) {
  // 1. Assert: Type(iteratorRecord.[[Iterator]]) is Object.
  Assert(Type(iteratorRecord.Iterator) === 'Object');
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
  if (Type(innerResult.Value) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult.Value);
  }
  // 9. Return Completion(completion).
  return Completion(completion);
}

// #sec-asynciteratorclose
export function* AsyncIteratorClose(iteratorRecord, completion) {
  // 1. Assert: Type(iteratorRecord.[[Iterator]]) is Object.
  Assert(Type(iteratorRecord.Iterator) === 'Object');
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
  if (Type(innerResult.Value) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', innerResult.Value);
  }
  // 9. Return Completion(completion).
  return Completion(completion);
}

// 7.4.8 #sec-createiterresultobject
export function CreateIterResultObject(value, done) {
  Assert(Type(done) === 'Boolean');
  const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  X(CreateDataProperty(obj, new Value('value'), value));
  X(CreateDataProperty(obj, new Value('done'), done));
  return obj;
}

// 7.4.9 #sec-createlistiteratorRecord
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

// 25.1.4.1 #sec-createasyncfromsynciterator
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

// 25.1.4.2.4 #sec-async-from-sync-iterator-value-unwrap-functions
function AsyncFromSyncIteratorValueUnwrapFunctions([value = Value.undefined]) {
  const F = this;

  return X(CreateIterResultObject(value, F.Done));
}

// 25.1.4.4 #sec-asyncfromsynciteratorcontinuation
export function AsyncFromSyncIteratorContinuation(result, promiseCapability) {
  const done = IteratorComplete(result);
  IfAbruptRejectPromise(done, promiseCapability);
  const value = IteratorValue(result);
  IfAbruptRejectPromise(value, promiseCapability);
  const valueWrapper = PromiseResolve(surroundingAgent.intrinsic('%Promise%'), value);
  IfAbruptRejectPromise(valueWrapper, promiseCapability);
  const steps = AsyncFromSyncIteratorValueUnwrapFunctions;
  const onFulfilled = X(CreateBuiltinFunction(steps, ['Done']));
  onFulfilled.Done = done;
  X(PerformPromiseThen(valueWrapper, onFulfilled, Value.undefined, promiseCapability));
  return promiseCapability.Promise;
}
