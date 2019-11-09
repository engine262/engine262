import { surroundingAgent } from '../engine.mjs';
import {
  AsyncFromSyncIteratorContinuation,
  Call,
  CreateIterResultObject,
  GetMethod,
  IteratorNext,
  NewPromiseCapability,
  Assert,
} from '../abstract-ops/all.mjs';
import { Type, Value } from '../value.mjs';
import { IfAbruptRejectPromise, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// 25.1.4.2.1 #sec-%asyncfromsynciteratorprototype%.next
function AsyncFromSyncIteratorPrototype_next([value = Value.undefined], { thisValue }) {
  const O = thisValue;
  Assert(Type(O) === 'Object' && 'SyncIteratorRecord' in O);
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  const syncIteratorRecord = O.SyncIteratorRecord;
  const result = IteratorNext(syncIteratorRecord, value);
  IfAbruptRejectPromise(result, promiseCapability);
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability));
}

// 25.1.4.2.2 #sec-%asyncfromsynciteratorprototype%.return
function AsyncFromSyncIteratorPrototype_return([value = Value.undefined], { thisValue }) {
  const O = thisValue;
  Assert(Type(O) === 'Object' && 'SyncIteratorRecord' in O);
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  const syncIterator = O.SyncIteratorRecord.Iterator;
  const ret = GetMethod(syncIterator, new Value('return'));
  IfAbruptRejectPromise(ret, promiseCapability);
  if (ret === Value.undefined) {
    const iterResult = X(CreateIterResultObject(value, Value.true));
    X(Call(promiseCapability.Resolve, Value.undefined, [iterResult]));
    return promiseCapability.Promise;
  }
  const result = Call(ret, syncIterator, [value]);
  IfAbruptRejectPromise(result, promiseCapability);
  if (Type(result) !== 'Object') {
    X(Call(promiseCapability.Reject, Value.undefined, [
      surroundingAgent.Throw('TypeError', 'NotAnObject', result).Value,
    ]));
    return promiseCapability.Promise;
  }
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability));
}

// 25.1.4.2.3 #sec-%asyncfromsynciteratorprototype%.throw
function AsyncFromSyncIteratorPrototype_throw([value = Value.undefined], { thisValue }) {
  const O = thisValue;
  Assert(Type(O) === 'Object' && 'SyncIteratorRecord' in O);
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  const syncIterator = O.SyncIteratorRecord.Iterator;
  const thr = GetMethod(syncIterator, new Value('throw'));
  IfAbruptRejectPromise(thr, promiseCapability);
  if (thr === Value.undefined) {
    X(Call(promiseCapability.Reject, Value.undefined, [value]));
    return promiseCapability.Promise;
  }
  const result = Call(thr, syncIterator, [value]);
  IfAbruptRejectPromise(result, promiseCapability);
  if (Type(result) !== 'Object') {
    X(Call(promiseCapability.Reject, Value.undefined, [
      surroundingAgent.Throw('TypeError', 'NotAnObject', result).Value,
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
