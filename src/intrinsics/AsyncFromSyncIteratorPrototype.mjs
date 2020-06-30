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

// #sec-%asyncfromsynciteratorprototype%.next
function AsyncFromSyncIteratorPrototype_next([value], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Assert: Type(O) is Object and O has a [[SyncIteratorRecord]] internal slot.
  Assert(Type(O) === 'Object' && 'SyncIteratorRecord' in O);
  // 3. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 4. Let syncIteratorRecord be O.[[SyncIteratorRecord]].
  const syncIteratorRecord = O.SyncIteratorRecord;
  // 5. If value is present, then
  let result;
  if (value !== undefined) {
    // a. Let result be IteratorNext(syncIteratorRecord, value).
    result = IteratorNext(syncIteratorRecord, value);
  } else { // 6. Else,
    // a. Let result be IteratorNext(syncIteratorRecord).
    result = IteratorNext(syncIteratorRecord);
  }
  // 7. IfAbruptRejectPromise(result, promiseCapability).
  IfAbruptRejectPromise(result, promiseCapability);
  // 8. Return ! AsyncFromSyncIteratorContinuation(result, promiseCapability).
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability));
}

// #sec-%asyncfromsynciteratorprototype%.return
function AsyncFromSyncIteratorPrototype_return([value], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Assert: Type(O) is Object and O has a [[SyncIteratorRecord]] internal slot.
  Assert(Type(O) === 'Object' && 'SyncIteratorRecord' in O);
  // 3. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 4. Let syncIterator be O.[[SyncIteratorRecord]].[[Iterator]].
  const syncIterator = O.SyncIteratorRecord.Iterator;
  // 5. Let return be GetMethod(syncIterator, "return").
  const ret = GetMethod(syncIterator, new Value('return'));
  // 6. IfAbruptRejectPromise(return, promiseCapability).
  IfAbruptRejectPromise(ret, promiseCapability);
  // 7. If return is undefined, then
  if (ret === Value.undefined) {
    // a. Let iterResult be ! CreateIterResultObject(value, true).
    const iterResult = X(CreateIterResultObject(value, Value.true));
    // b. Perform ! Call(promiseCapability.[[Resolve]], undefined, « iterResult »).
    X(Call(promiseCapability.Resolve, Value.undefined, [iterResult]));
    // c. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 8. If value is present, then
  let result;
  if (value !== undefined) {
    // a. Let result be Call(return, syncIterator, « value »).
    result = Call(ret, syncIterator, [value]);
  } else { // 9. Else,
    // a. Let result be Call(return, syncIterator).
    result = Call(ret, syncIterator);
  }
  // 10. IfAbruptRejectPromise(result, promiseCapability).
  IfAbruptRejectPromise(result, promiseCapability);
  // 11. If Type(result) is not Object, then
  if (Type(result) !== 'Object') {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « a newly created TypeError object »).
    X(Call(promiseCapability.Reject, Value.undefined, [
      surroundingAgent.Throw('TypeError', 'NotAnObject', result).Value,
    ]));
    // b. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 12. Return ! AsyncFromSyncIteratorContinuation(result, promiseCapability).
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability));
}

// #sec-%asyncfromsynciteratorprototype%.throw
function AsyncFromSyncIteratorPrototype_throw([value], { thisValue }) {
  // 1. Let O be this value.
  const O = thisValue;
  // 2. Assert: Type(O) is Object and O has a [[SyncIteratorRecord]] internal slot.
  Assert(Type(O) === 'Object' && 'SyncIteratorRecord' in O);
  // 3. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 4. Let syncIterator be O.[[SyncIteratorRecord]].[[Iterator]].
  const syncIterator = O.SyncIteratorRecord.Iterator;
  // 5. Let throw be GetMethod(syncIterator, "throw").
  const thr = GetMethod(syncIterator, new Value('throw'));
  // 6. IfAbruptRejectPromise(throw, promiseCapability).
  IfAbruptRejectPromise(thr, promiseCapability);
  // 7. If throw is undefined, then
  if (thr === Value.undefined) {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « value »).
    X(Call(promiseCapability.Reject, Value.undefined, [value]));
    // b. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 8. If value is present, then
  let result;
  if (value !== undefined) {
    // a. Let result be Call(throw, syncIterator, « value »).
    result = Call(thr, syncIterator, [value]);
  } else { // 9. Else,
    // a. Let result be Call(throw, syncIterator).
    result = Call(thr, syncIterator);
  }
  // 10. IfAbruptRejectPromise(result, promiseCapability).
  IfAbruptRejectPromise(result, promiseCapability);
  // 11. If Type(result) is not Object, then
  if (Type(result) !== 'Object') {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « a newly created TypeError object »).
    X(Call(promiseCapability.Reject, Value.undefined, [
      surroundingAgent.Throw('TypeError', 'NotAnObject', result).Value,
    ]));
    // b. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 12. Return ! AsyncFromSyncIteratorContinuation(result, promiseCapability).
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability));
}

export function BootstrapAsyncFromSyncIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', AsyncFromSyncIteratorPrototype_next, 0],
    ['return', AsyncFromSyncIteratorPrototype_return, 0],
    ['throw', AsyncFromSyncIteratorPrototype_throw, 0],
  ], realmRec.Intrinsics['%AsyncIteratorPrototype%']);

  realmRec.Intrinsics['%AsyncFromSyncIteratorPrototype%'] = proto;
}
