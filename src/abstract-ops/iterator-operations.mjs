import {
  Assert,
  Call,
  CreateBuiltinFunction,
  CreateDataProperty,
  Get,
  GetMethod,
  GetV,
  NewPromiseCapability,
  ObjectCreate,
  PerformPromiseThen,
  ToBoolean,
} from './all.mjs';
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
} from '../completion.mjs';

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
    // TODO: throw with an error message
    return surroundingAgent.Throw('TypeError');
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
    result = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, []));
  } else {
    result = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, [value]));
  }
  if (Type(result) !== 'Object') {
    // TODO: throw with an error message
    return surroundingAgent.Throw('TypeError');
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

// 7.4.6 #sec-iteratorclose
export function IteratorClose(iteratorRecord, completion) {
  // TODO: completion should be a Completion Record so this should not be necessary
  completion = EnsureCompletion(completion);
  Assert(Type(iteratorRecord.Iterator) === 'Object');
  Assert(completion instanceof Completion);
  const iterator = iteratorRecord.Iterator;
  const ret = Q(GetMethod(iterator, new Value('return')));
  if (ret === Value.undefined) {
    return Completion(completion);
  }
  const innerResult = EnsureCompletion(Call(ret, iterator, []));
  if (completion.Type === 'throw') {
    return Completion(completion);
  }
  if (innerResult.Type === 'throw') {
    return Completion(innerResult);
  }
  if (Type(innerResult.Value) !== 'Object') {
    // TODO: throw with an error message
    return surroundingAgent.Throw('TypeError');
  }
  return Completion(completion);
}

// 7.4.7 #sec-asynciteratorclose
export function* AsyncIteratorClose(iteratorRecord, completion) {
  Assert(Type(iteratorRecord.Iterator) === 'Object');
  Assert(completion instanceof Completion);
  const iterator = iteratorRecord.Iterator;
  const ret = Q(GetMethod(iterator, new Value('return')));
  if (ret === Value.undefined) {
    return Completion(completion);
  }
  let innerResult = EnsureCompletion(Call(ret, iterator, []));
  if (innerResult.Type === 'normal') {
    innerResult = EnsureCompletion(yield* Await(innerResult.Value));
  }
  if (completion.Type === 'throw') {
    return Completion(completion);
  }
  if (innerResult.Type === 'throw') {
    return Completion(innerResult);
  }
  if (Type(innerResult.Value) !== 'Object') {
    // TODO: throw with an error message
    return surroundingAgent.Throw('TypeError');
  }
  return Completion(completion);
}

// 7.4.8 #sec-createiterresultobject
export function CreateIterResultObject(value, done) {
  Assert(Type(done) === 'Boolean');
  const obj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  X(CreateDataProperty(obj, new Value('value'), value));
  X(CreateDataProperty(obj, new Value('done'), done));
  return obj;
}

// 7.4.9 #sec-createlistiteratorRecord
export function CreateListIteratorRecord(list) {
  const iterator = ObjectCreate(surroundingAgent.intrinsic('%IteratorPrototype%'), [
    'IteratedList',
    'ListIteratorNextIndex',
  ]);
  iterator.IteratedList = list;
  iterator.ListIteratorNextIndex = 0;
  const steps = ListIteratorNextSteps;
  const next = CreateBuiltinFunction(steps, []);
  return {
    Iterator: iterator,
    NextMethod: next,
    Done: Value.false,
  };
}

// 7.4.9.1 #sec-listiterator-next
function ListIteratorNextSteps(args, { thisValue }) {
  const O = thisValue;
  Assert(Type(O) === 'Object');
  Assert('IteratedList' in O);
  const list = O.IteratedList;
  const index = O.ListIteratorNextIndex;
  const len = list.length;
  if (index >= len) {
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  O.ListIteratorNextIndex += 1;
  return CreateIterResultObject(list[index], Value.false);
}

// 25.1.4.1 #sec-createasyncfromsynciterator
export function CreateAsyncFromSyncIterator(syncIteratorRecord) {
  const asyncIterator = X(ObjectCreate(surroundingAgent.intrinsic('%AsyncFromSyncIteratorPrototype%'), [
    'SyncIteratorRecord',
  ]));
  asyncIterator.SyncIteratorRecord = syncIteratorRecord;
  return Q(GetIterator(asyncIterator, 'async'));
}

// 25.1.4.2.5 #sec-async-from-sync-iterator-value-unwrap-functions
function AsyncFromSyncIteratorValueUnwrapFunctions([value = Value.undefined]) {
  const F = this;

  return X(CreateIterResultObject(value, F.Done));
}

// 25.1.4.4 #sec-async-from-sync-iterator-continuation
export function AsyncFromSyncIteratorContinuation(result, promiseCapability) {
  const done = IteratorComplete(result);
  IfAbruptRejectPromise(done, promiseCapability);
  const value = IteratorValue(result);
  IfAbruptRejectPromise(value, promiseCapability);
  const valueWrapperCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  X(Call(valueWrapperCapability.Resolve, Value.undefined, [value]));
  const steps = AsyncFromSyncIteratorValueUnwrapFunctions;
  const onFulfilled = CreateBuiltinFunction(steps, ['Done']);
  onFulfilled.Done = done;
  X(PerformPromiseThen(valueWrapperCapability.Promise, onFulfilled, Value.undefined, promiseCapability));
  return promiseCapability.Promise;
}
