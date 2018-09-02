import { surroundingAgent } from '../engine.mjs';
import {
  Call,
  CreateBuiltinFunction,
  CreateIterResultObject,
  GetMethod,
  IteratorComplete,
  IteratorNext,
  IteratorValue,
  NewPromiseCapability,
  ObjectCreate,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import { PerformPromiseThen } from './PromisePrototype.mjs';
import { New as NewValue, Type } from '../value.mjs';
import { X, IfAbruptRejectPromise } from '../completion.mjs';

// #sec-async-from-sync-iterator-value-unwrap-functions
function AsyncFromSyncIteratorValueUnwrapFunctions([value]) {
  const F = this;

  return X(CreateIterResultObject(value, F.Done));
}

// #sec-async-from-sync-iterator-continuation
function AsyncFromSyncIteratorContinuation(result, promiseCapability) {
  const done = IteratorComplete(result);
  IfAbruptRejectPromise(done, promiseCapability);
  const value = IteratorValue(result);
  IfAbruptRejectPromise(done, promiseCapability);
  const valueWrapperCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  const steps = AsyncFromSyncIteratorValueUnwrapFunctions;
  X(Call(valueWrapperCapability.Resolve, NewValue(undefined), [value]));
  const onFulfilled = CreateBuiltinFunction(steps, ['Done']);
  onFulfilled.Done = done;
  X(PerformPromiseThen(
    valueWrapperCapability.Promise, onFulfilled, NewValue(undefined), promiseCapability,
  ));
  return promiseCapability.Promise;
}

function AsyncFromSyncIteratorPrototype_next([value], { thisValue }) {
  const O = thisValue;
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  if (Type(O) !== 'Object' || !('SyncIteratorRecord' in O)) {
    const invalidIteratorError = surroundingAgent.Throw('TypeError').Value;
    X(Call(promiseCapability.Reject, NewValue(undefined), [invalidIteratorError]));
    return promiseCapability.Promise;
  }
  const syncIteratorRecord = O.SyncIteratorRecord;
  const result = IteratorNext(syncIteratorRecord, value);
  IfAbruptRejectPromise(result, promiseCapability);
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability));
}

function AsyncFromSyncIteratorPrototype_return([value], { thisValue }) {
  const O = thisValue;
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  if (Type(O) !== 'Object' || !('SyncIteratorRecord' in O)) {
    const invalidIteratorError = surroundingAgent.Throw('TypeError').Value;
    X(Call(promiseCapability.Reject, NewValue(undefined), [invalidIteratorError]));
    return promiseCapability.Promise;
  }
  const syncIterator = O.SyncIteratorRecord.Iterator;
  const ret = GetMethod(syncIterator, NewValue('return'));
  IfAbruptRejectPromise(ret, promiseCapability);
  if (Type(ret) === 'Undefined') {
    const iterResult = X(CreateIterResultObject(value, NewValue(true)));
    X(Call(promiseCapability.Resolve, NewValue(undefined), [iterResult]));
    return promiseCapability.Promise;
  }
  const result = Call(ret, syncIterator, [value]);
  if (Type(result) !== 'Object') {
    X(Call(promiseCapability.Reject, NewValue(undefined), [
      surroundingAgent.Throw('TypeError', 'iterator result was not an object'),
    ]));
    return promiseCapability.Promise;
  }
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability));
}

function AsyncFromSyncIteratorPrototype_throw([value], { thisValue }) {
  const O = thisValue;
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  if (Type(O) !== 'Object' || !('SyncIteratorRecord' in O)) {
    const invalidIteratorError = surroundingAgent.Throw('TypeError').Value;
    X(Call(promiseCapability.Reject, NewValue(undefined), [invalidIteratorError]));
    return promiseCapability.Promise;
  }
  const syncIterator = O.SyncIteratorRecord.Iterator;
  const thr = GetMethod(syncIterator, NewValue('throw'));
  IfAbruptRejectPromise(thr, promiseCapability);
  if (Type(thr) === 'Undefined') {
    const iterResult = X(CreateIterResultObject(value, NewValue(true)));
    X(Call(promiseCapability.Resolve, NewValue(undefined), [iterResult]));
    return promiseCapability.Promise;
  }
  const result = Call(thr, syncIterator, [value]);
  IfAbruptRejectPromise(result, promiseCapability);
  if (Type(result) !== 'Object') {
    X(Call(promiseCapability.Reject, NewValue(undefined), [
      surroundingAgent.Throw('TypeError', 'iterator result was not an object'),
    ]));
    return promiseCapability.Promise;
  }
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability));
}

export function CreateAsyncFromSyncIteratorPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%AsyncIteratorPrototype%']);

  [
    ['next', AsyncFromSyncIteratorPrototype_next, 1],
    ['return', AsyncFromSyncIteratorPrototype_return, 1],
    ['throw', AsyncFromSyncIteratorPrototype_throw, 1],
  ].forEach(([name, fn, len]) => {
    fn = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(fn, NewValue(name));
    SetFunctionLength(fn, NewValue(len));
    proto.DefineOwnProperty(NewValue(name), {
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%AsyncFromSyncIteratorPrototype%'] = proto;
}
