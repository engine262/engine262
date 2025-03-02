// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  AsyncFromSyncIteratorContinuation,
  Call,
  CreateIterResultObject,
  GetMethod,
  IteratorClose,
  IteratorNext,
  NewPromiseCapability,
  Assert,
} from '../abstract-ops/all.mjs';
import { ObjectValue, Value } from '../value.mjs';
import {
  IfAbruptRejectPromise,
  X,
  NormalCompletion
} from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-%asyncfromsynciteratorprototype%.next */
function AsyncFromSyncIteratorPrototype_next([value], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Assert: Type(O) is Object and O has a [[SyncIteratorRecord]] internal slot.
  Assert(O instanceof ObjectValue && 'SyncIteratorRecord' in O);
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
  // 8. Return ! AsyncFromSyncIteratorContinuation(result, promiseCapability, syncIteratorRecord, true).
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability, syncIteratorRecord, Value.true));
}

/** https://tc39.es/ecma262/#sec-%asyncfromsynciteratorprototype%.return */
function AsyncFromSyncIteratorPrototype_return([value], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Assert: Type(O) is Object and O has a [[SyncIteratorRecord]] internal slot.
  Assert(O instanceof ObjectValue && 'SyncIteratorRecord' in O);
  // 3. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 4. Let syncIteratorRecord be O.[[SyncIteratorRecord]].
  const syncIteratorRecord = O.SyncIteratorRecord;
  // 5. Let syncIterator be syncIteratorRecord.[[Iterator]].
  const syncIterator = syncIteratorRecord.Iterator;
  // 6. Let return be GetMethod(syncIterator, "return").
  const ret = GetMethod(syncIterator, Value('return'));
  // 7. IfAbruptRejectPromise(return, promiseCapability).
  IfAbruptRejectPromise(ret, promiseCapability);
  // 8. If return is undefined, then
  if (ret === Value.undefined) {
    // a. Let iterResult be ! CreateIterResultObject(value, true).
    const iterResult = X(CreateIterResultObject(value, Value.true));
    // b. Perform ! Call(promiseCapability.[[Resolve]], undefined, « iterResult »).
    X(Call(promiseCapability.Resolve, Value.undefined, [iterResult]));
    // c. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 9. If value is present, then
  let result;
  if (value !== undefined) {
    // a. Let result be Call(return, syncIterator, « value »).
    result = Call(ret, syncIterator, [value]);
  } else { // 10. Else,
    // a. Let result be Call(return, syncIterator).
    result = Call(ret, syncIterator);
  }
  // 11. IfAbruptRejectPromise(result, promiseCapability).
  IfAbruptRejectPromise(result, promiseCapability);
  // 12. If Type(result) is not Object, then
  if (!(result instanceof ObjectValue)) {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « a newly created TypeError object »).
    X(Call(promiseCapability.Reject, Value.undefined, [
      surroundingAgent.Throw('TypeError', 'NotAnObject', result).Value,
    ]));
    // b. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 13. Return ! AsyncFromSyncIteratorContinuation(result, promiseCapability, syncIteratorRecord, false).
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability, syncIteratorRecord, Value.false));
}

/** https://tc39.es/ecma262/#sec-%asyncfromsynciteratorprototype%.throw */
function AsyncFromSyncIteratorPrototype_throw([value], { thisValue }) {
  // 1. Let O be this value.
  const O = thisValue;
  // 2. Assert: Type(O) is Object and O has a [[SyncIteratorRecord]] internal slot.
  Assert(O instanceof ObjectValue && 'SyncIteratorRecord' in O);
  // 3. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 4. Let syncIteratorsyncIteratorRecord be O.[[SyncIteratorRecord]].
  const syncIteratorRecord = O.SyncIteratorRecord;
  // 5. Let syncIterator be syncIteratorRecord.[[Iterator]].
  const syncIterator = syncIteratorRecord.Iterator;
  // 6. Let throw be GetMethod(syncIterator, "throw").
  const thr = GetMethod(syncIterator, Value('throw'));
  // 7. IfAbruptRejectPromise(throw, promiseCapability).
  IfAbruptRejectPromise(thr, promiseCapability);
  // 8. If throw is undefined, then
  if (thr === Value.undefined) {
    // a. NOTE: If syncIterator does not have a throw method, close it to give it a chance to clean up before we reject the capability.
    // b. Let closeCompletion be Completion { [[Type]]: normal, [[Value]]: empty, [[Target]]: empty }.
    const closeCompletion = NormalCompletion(undefined);
    // c. Let result be IteratorClose(syncIteratorRecord, closeCompletion).
    const result = IteratorClose(syncIteratorRecord, closeCompletion);
    // d. IfAbruptRejectPromise(result, promiseCapability).
    IfAbruptRejectPromise(result, promiseCapability);
    // e. NOTE: The next step throws a TypeError to indicate that there was a protocol violation: syncIterator does not have a throw method.
    // f. NOTE: If closing syncIterator does not throw then the result of that operation is ignored, even if it yields a rejected promise.
    // g. Perform ! Call(promiseCapability.[[Reject]], undefined, « a newly created TypeError object »).
    X(Call(promiseCapability.Reject, Value.undefined,  [
      surroundingAgent.Throw('TypeError', 'IteratorThrowMissing').Value,
    ]));
    // h. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 9. If value is present, then
  let result;
  if (value !== undefined) {
    // a. Let result be Call(throw, syncIterator, « value »).
    result = Call(thr, syncIterator, [value]);
  } else { // 10. Else,
    // a. Let result be Call(throw, syncIterator).
    result = Call(thr, syncIterator);
  }
  // 11. IfAbruptRejectPromise(result, promiseCapability).
  IfAbruptRejectPromise(result, promiseCapability);
  // 12. If Type(result) is not Object, then
  if (!(result instanceof ObjectValue)) {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « a newly created TypeError object »).
    X(Call(promiseCapability.Reject, Value.undefined, [
      surroundingAgent.Throw('TypeError', 'NotAnObject', result).Value,
    ]));
    // b. Return promiseCapability.[[Promise]].
    return promiseCapability.Promise;
  }
  // 13. Return ! AsyncFromSyncIteratorContinuation(result, promiseCapability, syncIteratorRecord, true).
  return X(AsyncFromSyncIteratorContinuation(result, promiseCapability, syncIteratorRecord, Value.true));
}

export function bootstrapAsyncFromSyncIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', AsyncFromSyncIteratorPrototype_next, 0],
    ['return', AsyncFromSyncIteratorPrototype_return, 0],
    ['throw', AsyncFromSyncIteratorPrototype_throw, 0],
  ], realmRec.Intrinsics['%AsyncIteratorPrototype%']);

  realmRec.Intrinsics['%AsyncFromSyncIteratorPrototype%'] = proto;
}
