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
  PromiseResolve,
} from '../abstract-ops/all.mjs';
import { PerformPromiseThen } from './PromisePrototype.mjs';
import { Value, Type } from '../value.mjs';
import { Q, X, IfAbruptRejectPromise } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

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
  const valueWrapper = Q(PromiseResolve(surroundingAgent.intrinsic('%Promise%'), value));
  const steps = AsyncFromSyncIteratorValueUnwrapFunctions;
  const onFulfilled = CreateBuiltinFunction(steps, ['Done']);
  onFulfilled.Done = done;
  X(PerformPromiseThen(valueWrapper, onFulfilled, Value.undefined, promiseCapability));
  return promiseCapability.Promise;
}

function AsyncFromSyncIteratorPrototype_next([value], { thisValue }) {
  const O = thisValue;
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  if (Type(O) !== 'Object' || !('SyncIteratorRecord' in O)) {
    const invalidIteratorError = surroundingAgent.Throw('TypeError').Value;
    X(Call(promiseCapability.Reject, Value.undefined, [invalidIteratorError]));
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
    X(Call(promiseCapability.Reject, Value.undefined, [invalidIteratorError]));
    return promiseCapability.Promise;
  }
  const syncIterator = O.SyncIteratorRecord.Iterator;
  const ret = GetMethod(syncIterator, new Value('return'));
  IfAbruptRejectPromise(ret, promiseCapability);
  if (Type(ret) === 'Undefined') {
    const iterResult = X(CreateIterResultObject(value, Value.true));
    X(Call(promiseCapability.Resolve, Value.undefined, [iterResult]));
    return promiseCapability.Promise;
  }
  const result = Call(ret, syncIterator, [value]);
  if (Type(result) !== 'Object') {
    X(Call(promiseCapability.Reject, Value.undefined, [
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
    X(Call(promiseCapability.Reject, Value.undefined, [invalidIteratorError]));
    return promiseCapability.Promise;
  }
  const syncIterator = O.SyncIteratorRecord.Iterator;
  const thr = GetMethod(syncIterator, new Value('throw'));
  IfAbruptRejectPromise(thr, promiseCapability);
  if (Type(thr) === 'Undefined') {
    const iterResult = X(CreateIterResultObject(value, Value.true));
    X(Call(promiseCapability.Resolve, Value.undefined, [iterResult]));
    return promiseCapability.Promise;
  }
  const result = Call(thr, syncIterator, [value]);
  IfAbruptRejectPromise(result, promiseCapability);
  if (Type(result) !== 'Object') {
    X(Call(promiseCapability.Reject, Value.undefined, [
      surroundingAgent.Throw('TypeError', 'iterator result was not an object'),
    ]));
    return promiseCapability.Promise;
  }
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability));
}

export function CreateAsyncFromSyncIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', AsyncFromSyncIteratorPrototype_next, 1],
    ['return', AsyncFromSyncIteratorPrototype_return, 1],
    ['throw', AsyncFromSyncIteratorPrototype_throw, 1],
  ], realmRec.Intrinsics['%AsyncIteratorPrototype%']);

  realmRec.Intrinsics['%AsyncFromSyncIteratorPrototype%'] = proto;
}
