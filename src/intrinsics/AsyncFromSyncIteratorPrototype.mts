import { surroundingAgent } from '../engine.mts';
import {
  AsyncFromSyncIteratorContinuation,
  Call,
  CreateIterResultObject,
  GetMethod,
  IteratorNext,
  NewPromiseCapability,
  Assert,
  type OrdinaryObject,
  Realm,
  type IteratorRecord,
} from '../abstract-ops/all.mts';
import {
  ObjectValue, Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { IfAbruptRejectPromise, Q, X } from '../completion.mts';
import { __ts_cast__ } from '../helpers.mts';
import { bootstrapPrototype } from './bootstrap.mts';

export interface AsyncFromSyncIteratorObject extends OrdinaryObject {
  readonly SyncIteratorRecord: IteratorRecord;
}
/** https://tc39.es/ecma262/#sec-%asyncfromsynciteratorprototype%.next */
function AsyncFromSyncIteratorPrototype_next([value]: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let O be the this value.
  const O = thisValue as AsyncFromSyncIteratorObject;
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
  // 8. Return ! AsyncFromSyncIteratorContinuation(result, promiseCapability).
  return X(AsyncFromSyncIteratorContinuation(X(result), promiseCapability));
}

/** https://tc39.es/ecma262/#sec-%asyncfromsynciteratorprototype%.return */
function AsyncFromSyncIteratorPrototype_return([value]: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let O be the this value.
  const O = thisValue as AsyncFromSyncIteratorObject;
  // 2. Assert: Type(O) is Object and O has a [[SyncIteratorRecord]] internal slot.
  Assert(O instanceof ObjectValue && 'SyncIteratorRecord' in O);
  // 3. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 4. Let syncIterator be O.[[SyncIteratorRecord]].[[Iterator]].
  const syncIterator = O.SyncIteratorRecord.Iterator;
  // 5. Let return be GetMethod(syncIterator, "return").
  let ret = GetMethod(syncIterator, Value('return'));
  // 6. IfAbruptRejectPromise(return, promiseCapability).
  IfAbruptRejectPromise(ret, promiseCapability);
  ret = Q(ret);
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
  if (!(result instanceof ObjectValue)) {
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

/** https://tc39.es/ecma262/#sec-%asyncfromsynciteratorprototype%.throw */
function AsyncFromSyncIteratorPrototype_throw([value]: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let O be this value.
  const O = thisValue as AsyncFromSyncIteratorObject;
  // 2. Assert: Type(O) is Object and O has a [[SyncIteratorRecord]] internal slot.
  Assert(O instanceof ObjectValue && 'SyncIteratorRecord' in O);
  // 3. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 4. Let syncIterator be O.[[SyncIteratorRecord]].[[Iterator]].
  const syncIterator = O.SyncIteratorRecord.Iterator;
  // 5. Let throw be GetMethod(syncIterator, "throw").
  let thr = GetMethod(syncIterator, Value('throw'));
  // 6. IfAbruptRejectPromise(throw, promiseCapability).
  IfAbruptRejectPromise(thr, promiseCapability);
  thr = Q(thr);
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
  if (!(result instanceof ObjectValue)) {
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

export function bootstrapAsyncFromSyncIteratorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', AsyncFromSyncIteratorPrototype_next, 0],
    ['return', AsyncFromSyncIteratorPrototype_return, 0],
    ['throw', AsyncFromSyncIteratorPrototype_throw, 0],
  ], realmRec.Intrinsics['%AsyncIteratorPrototype%']);

  realmRec.Intrinsics['%AsyncFromSyncIteratorPrototype%'] = proto;
}
