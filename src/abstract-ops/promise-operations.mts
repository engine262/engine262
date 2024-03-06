// @ts-nocheck
import {
  HostMakeJobCallback,
  HostCallJobCallback,
  HostEnqueuePromiseJob,
  HostPromiseRejectionTracker,
  surroundingAgent,
} from '../engine.mjs';
import {
  ObjectValue, Value, UndefinedValue, BooleanValue, NullValue, type Arguments,
} from '../value.mjs';
import {
  AbruptCompletion,
  Completion,
  EnsureCompletion,
  NormalCompletion,
  Q,
  ThrowCompletion,
  X,
} from '../completion.mjs';
import type { Mutable } from '../helpers.mjs';
import {
  Assert,
  Call,
  Construct,
  CreateBuiltinFunction,
  Get,
  IsCallable,
  IsConstructor,
  SameValue,
  GetFunctionRealm,
  isFunctionObject,
  type FunctionObject,
  type BuiltinFunctionObject,
  Realm,
  AsyncContextSwap,
  type AsyncContextStore,
  AsyncContextSnapshot,
} from './all.mjs';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-promise-objects */

/** https://tc39.es/ecma262/#table-internal-slots-of-promise-instances */
export interface PromiseObjectValue extends ObjectValue {
  PromiseState: 'pending' | 'fulfilled' | 'rejected';
  PromiseResult: Value | undefined;
  PromiseFulfillReactions: undefined | PromiseReactionRecord[];
  PromiseRejectReactions: undefined | PromiseReactionRecord[];
  PromiseIsHandled: BooleanValue;
}

export interface PromiseResolvingFunctionObject extends BuiltinFunctionObject {
  readonly Promise: PromiseObjectValue;
  readonly AlreadyResolved: { Value: boolean };
}

/** https://tc39.es/ecma262/#sec-promisecapability-records */
export class PromiseCapabilityRecord {
  readonly Promise: ObjectValue | UndefinedValue;
  readonly Resolve: FunctionObject | UndefinedValue;
  readonly Reject: FunctionObject | UndefinedValue;
  constructor() {
    this.Promise = Value.undefined;
    this.Resolve = Value.undefined;
    this.Reject = Value.undefined;
  }
}

/** https://tc39.es/ecma262/#sec-promisereaction-records */
export class PromiseReactionRecord {
  readonly Capability: PromiseCapabilityRecord | UndefinedValue;
  readonly Type: 'Fulfill' | 'Reject';
  readonly Handler;
  readonly PromiseAsyncContextSnapshot: AsyncContextStore;
  constructor(O: PromiseReactionRecord) {
    Assert(O.Capability instanceof PromiseCapabilityRecord
        || O.Capability === Value.undefined);
    Assert(O.Type === 'Fulfill' || O.Type === 'Reject');
    Assert(O.Handler === undefined
           || isFunctionObject(O.Handler.Callback));
    this.Capability = O.Capability;
    this.Type = O.Type;
    this.Handler = O.Handler;
    this.PromiseAsyncContextSnapshot = O.PromiseAsyncContextSnapshot;
  }
}

/** https://tc39.es/ecma262/#sec-createresolvingfunctions */
export function CreateResolvingFunctions(promise: PromiseObjectValue) {
  // 1. Let alreadyResolved be the Record { [[Value]]: false }.
  const alreadyResolved = { Value: false };
  // 2. Let stepsResolve be the algorithm steps defined in Promise Resolve Functions.
  const stepsResolve = PromiseResolveFunctions;
  // 3. Let lengthResolve be the number of non-optional parameters of the function definition in Promise Resolve Functions.
  const lengthResolve = 1;
  // 4. Let resolve be ! CreateBuiltinFunction(stepsResolve, lengthResolve, "", « [[Promise]], [[AlreadyResolved]] »).
  const resolve = X(CreateBuiltinFunction(stepsResolve, lengthResolve, Value(''), ['Promise', 'AlreadyResolved'])) as Mutable<PromiseResolvingFunctionObject>;
  // 5. Set resolve.[[Promise]] to promise.
  resolve.Promise = promise;
  // 6. Set resolve.[[AlreadyResolved]] to alreadyResolved.
  resolve.AlreadyResolved = alreadyResolved;
  // 7. Let stepsReject be the algorithm steps defined in Promise Reject Functions.
  const stepsReject = PromiseRejectFunctions;
  // 8. Let lengthReject be the number of non-optional parameters of the function definition in Promise Reject Functions.
  const lengthReject = 1;
  // 9. Let reject be ! CreateBuiltinFunction(stepsReject, lengthReject, "", « [[Promise]], [[AlreadyResolved]] »).
  const reject = X(CreateBuiltinFunction(stepsReject, lengthReject, Value(''), ['Promise', 'AlreadyResolved'])) as Mutable<PromiseResolvingFunctionObject>;
  // 10. Set reject.[[Promise]] to promise.
  reject.Promise = promise;
  // 11. Set reject.[[AlreadyResolved]] to alreadyResolved.
  reject.AlreadyResolved = alreadyResolved;
  // 12. Return the Record { [[Resolve]]: resolve, [[Reject]]: reject }.
  return {
    Resolve: resolve,
    Reject: reject,
  };
}

/** https://tc39.es/ecma262/#sec-promise-reject-functions */
function PromiseRejectFunctions(this: PromiseResolvingFunctionObject, [reason = Value.undefined]) {
  const F = this;

  Assert('Promise' in F && F.Promise instanceof ObjectValue);
  const promise = F.Promise;
  const alreadyResolved = F.AlreadyResolved;
  if (alreadyResolved.Value === true) {
    return Value.undefined;
  }
  alreadyResolved.Value = true;
  return RejectPromise(promise, reason);
}

/** https://tc39.es/ecma262/#sec-newpromiseresolvethenablejob */
function NewPromiseResolveThenableJob(promiseToResolve: PromiseObjectValue, thenable, then) {
  // 1. Let snapshot be AsyncContextSnapshot().
  const snapshot = AsyncContextSnapshot();
  // 2. Let job be a new Job abstract closure with no parameters that captures
  //    promiseToResolve, thenable, then, and snapshot and performs the following steps when called:
  const job = () => {
    // a. Let resolvingFunctions be CreateResolvingFunctions(promiseToResolve).
    const resolvingFunctions = CreateResolvingFunctions(promiseToResolve);
    // b. Let previousContextMapping be AsyncContextSwap(snapshot).
    const previousContextMapping = AsyncContextSwap(snapshot);
    // c. Let thenCallResult be HostCallJobCallback(then, thenable, « resolvingFunctions.[[Resolve]], resolvingFunctions.[[Reject]] »).
    const thenCallResult = HostCallJobCallback(then, thenable, [resolvingFunctions.Resolve, resolvingFunctions.Reject]);
    // d. If thenCallResult is an abrupt completion, then
    if (thenCallResult instanceof AbruptCompletion) {
      // i. Let rejectResult be Completion(Call(resolvingFunctions.[[Reject]], undefined, « thenCallResult.[[Value]] »)).
      const rejectResult = Completion(Call(resolvingFunctions.Reject, Value.undefined, [thenCallResult.Value]));
      // ii. AsyncContextSwap(previousContextMapping).
      AsyncContextSwap(previousContextMapping);
      // ii. Return rejectResult.
      return rejectResult;
    }
    // e. AsyncContextSwap(previousContextMapping).
    AsyncContextSwap(previousContextMapping);
    // f. Return ? thenCallResult.
    return Q(thenCallResult);
  };
  // 3. Let getThenRealmResult be GetFunctionRealm(then.[[Callback]]).
  const getThenRealmResult = EnsureCompletion(GetFunctionRealm(then.Callback));
  // 4. If getThenRealmResult is a normal completion, then let thenRealm be getThenRealmResult.[[Value]].
  let thenRealm;
  if (getThenRealmResult instanceof NormalCompletion) {
    thenRealm = getThenRealmResult.Value;
  } else {
    // 5. Else, let _thenRealm_ be the current Realm Record.
    thenRealm = surroundingAgent.currentRealmRecord;
  }
  // 6. NOTE: _thenRealm_ is never *null*. When _then_.[[Callback]] is a revoked Proxy and no code runs, _thenRealm_ is used to create error objects.
  // 7. Return { [[Job]]: job, [[Realm]]: thenRealm }.
  return { Job: job, Realm: thenRealm };
}

/** https://tc39.es/ecma262/#sec-promise-resolve-functions */
function PromiseResolveFunctions(this: PromiseResolvingFunctionObject, [resolution = Value.undefined]: Arguments) {
  // 1. Let F be the active function object.
  const F = this;
  // 2. Assert: F has a [[Promise]] internal slot whose value is an Object.
  Assert('Promise' in F && F.Promise instanceof ObjectValue);
  // 3. Let promise be F.[[Promise]].
  const promise = F.Promise;
  // 4. Let alreadyResolved be F.[[AlreadyResolved]].
  const alreadyResolved = F.AlreadyResolved;
  // 5. If alreadyResolved.[[Value]] is true, return undefined.
  if (alreadyResolved.Value === true) {
    return Value.undefined;
  }
  // 6. Set alreadyResolved.[[Value]] to true.
  alreadyResolved.Value = true;
  // 7. If SameValue(resolution, promise) is true, then
  if (SameValue(resolution, promise) === Value.true) {
    // a. Let selfResolutionError be a newly created TypeError object.
    const selfResolutionError = surroundingAgent.Throw('TypeError', 'CannotResolvePromiseWithItself').Value;
    // b. Return RejectPromise(promise, selfResolutionError).
    return RejectPromise(promise, selfResolutionError);
  }
  // 8. If Type(resolution) is not Object, then
  if (!(resolution instanceof ObjectValue)) {
    // a. Return FulfillPromise(promise, resolution).
    return FulfillPromise(promise, resolution);
  }
  // 9. Let then be Get(resolution, "then").
  const then = Get(resolution, Value('then'));
  // 10. If then is an abrupt completion, then
  if (then instanceof AbruptCompletion) {
    // a. Return RejectPromise(promise, then.[[Value]]).
    return RejectPromise(promise, then.Value);
  }
  // 11. Let thenAction be then.[[Value]].
  const thenAction = then.Value;
  // 12. If IsCallable(thenAction) is false, then
  if (IsCallable(thenAction) === Value.false) {
    // a. Return FulfillPromise(promise, resolution).
    return FulfillPromise(promise, resolution);
  }
  // 13. Let thenJobCallback be HostMakeJobCallback(thenAction).
  const thenJobCallback = HostMakeJobCallback(thenAction);
  // 14. Let job be NewPromiseResolveThenableJob(promise, resolution, thenJobCallback).
  const job = NewPromiseResolveThenableJob(promise, resolution, thenJobCallback);
  // 15. Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]]).
  HostEnqueuePromiseJob(job.Job, job.Realm);
  // 16. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-fulfillpromise */
function FulfillPromise(promise: PromiseObjectValue, value: Value) {
  Assert(promise.PromiseState === 'pending');
  const reactions = promise.PromiseFulfillReactions;
  promise.PromiseResult = value;
  promise.PromiseFulfillReactions = undefined;
  promise.PromiseRejectReactions = undefined;
  promise.PromiseState = 'fulfilled';
  return TriggerPromiseReactions(reactions!, value);
}

/** https://tc39.es/ecma262/#sec-newpromisecapability */
export function NewPromiseCapability(C: Value): NormalCompletion<PromiseCapabilityRecord> | ThrowCompletion {
  // 1. If IsConstructor(C) is false, throw a TypeError exception.
  if (IsConstructor(C) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', C);
  }
  // 2. NOTE: C is assumed to be a constructor function that supports the parameter conventions of the Promise constructor (see 26.2.3.1).
  // 3. Let promiseCapability be the PromiseCapability Record { [[Promise]]: undefined, [[Resolve]]: undefined, [[Reject]]: undefined }.
  const promiseCapability = new PromiseCapabilityRecord() as Mutable<PromiseCapabilityRecord>;
  // 4. Let executorClosure be a new Abstract Closure with parameters (resolve, reject) that captures promiseCapability and performs the following steps when called:
  const executorClosure = ([resolve = Value.undefined, reject = Value.undefined]) => {
    // a. If promiseCapability.[[Resolve]] is not undefined, throw a TypeError exception.
    if (!(promiseCapability.Resolve instanceof UndefinedValue)) {
      return surroundingAgent.Throw('TypeError', 'PromiseCapabilityFunctionAlreadySet', 'resolve');
    }
    // b. If promiseCapability.[[Reject]] is not undefined, throw a TypeError exception.
    if (!(promiseCapability.Reject instanceof UndefinedValue)) {
      return surroundingAgent.Throw('TypeError', 'PromiseCapabilityFunctionAlreadySet', 'reject');
    }
    // c. Set promiseCapability.[[Resolve]] to resolve.
    promiseCapability.Resolve = resolve;
    // d. Set promiseCapability.[[Reject]] to reject.
    promiseCapability.Reject = reject;
    // e. Return undefined.
    return Value.undefined;
  };
  // 5. Let executor be ! CreateBuiltinFunction(executorClosure, 2, "", « »).
  const executor = X(CreateBuiltinFunction(executorClosure, 2, Value(''), []));
  // 8. Let promise be ? Construct(C, « executor »).
  const promise = Q(Construct(C as FunctionObject, [executor]));
  // 9. If IsCallable(promiseCapability.[[Resolve]]) is false, throw a TypeError exception.
  if (IsCallable(promiseCapability.Resolve) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'PromiseResolveFunction', promiseCapability.Resolve);
  }
  // 10. If IsCallable(promiseCapability.[[Reject]]) is false, throw a TypeError exception.
  if (IsCallable(promiseCapability.Reject) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'PromiseRejectFunction', promiseCapability.Reject);
  }
  // 11. Set promiseCapability.[[Promise]] to promise.
  promiseCapability.Promise = promise;
  // 12. Return promiseCapability.
  return NormalCompletion(promiseCapability);
}

/** https://tc39.es/ecma262/#sec-ispromise */
export function IsPromise(x: Value): BooleanValue {
  if (!(x instanceof ObjectValue)) {
    return Value.false;
  }
  if (!('PromiseState' in x)) {
    return Value.false;
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-rejectpromise */
function RejectPromise(promise: PromiseObjectValue, reason: Value) {
  Assert(promise.PromiseState === 'pending');
  const reactions = promise.PromiseRejectReactions;
  promise.PromiseResult = reason;
  promise.PromiseFulfillReactions = undefined;
  promise.PromiseRejectReactions = undefined;
  promise.PromiseState = 'rejected';
  if (promise.PromiseIsHandled === Value.false) {
    HostPromiseRejectionTracker(promise, 'reject');
  }
  return TriggerPromiseReactions(reactions!, reason);
}

/** https://tc39.es/ecma262/#sec-triggerpromisereactions */
function TriggerPromiseReactions(reactions: readonly PromiseReactionRecord[], argument: Value) {
  // 1. For each reaction in reactions, do
  reactions.forEach((reaction) => {
    // a. Let job be NewPromiseReactionJob(reaction, argument).
    const job = NewPromiseReactionJob(reaction, argument);
    // b. Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]]).
    HostEnqueuePromiseJob(job.Job, job.Realm);
  });
  // 2. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-promise-resolve */
export function PromiseResolve(C: ObjectValue, x: Value) {
  Assert(C instanceof ObjectValue);
  if (IsPromise(x) === Value.true) {
    const xConstructor = Q(Get(x as PromiseObjectValue, Value('constructor')));
    if (SameValue(xConstructor, C) === Value.true) {
      return x;
    }
  }
  const promiseCapability = Q(NewPromiseCapability(C));
  Q(Call(promiseCapability.Resolve, Value.undefined, [x]));
  return promiseCapability.Promise;
}

/** https://tc39.es/ecma262/#sec-newpromisereactionjob */
function NewPromiseReactionJob(reaction: PromiseReactionRecord, argument: Value) {
  // 1. Let job be a new Job abstract closure with no parameters that captures
  //    reaction and argument and performs the following steps when called:
  const job = () => {
    Assert(reaction instanceof PromiseReactionRecord);
    // a. Let promiseCapability be reaction.[[Capability]].
    const promiseCapability = reaction.Capability;
    // b. Let type be reaction.[[Type]].
    const type = reaction.Type;
    // c. Let handler be reaction.[[Handler]].
    const handler = reaction.Handler;
    // d. Let previousContextMapping be AsyncContextSwap(reaction.[[PromiseAsyncContextSnapshot]]).
    const previousContextMapping = AsyncContextSwap(reaction.PromiseAsyncContextSnapshot);
    let handlerResult;
    // e. If handler is empty, then
    if (handler === undefined) {
      // i. If type is Fulfill, let handlerResult be NormalCompletion(argument).
      if (type === 'Fulfill') {
        handlerResult = NormalCompletion(argument);
      } else {
        // 1. Assert: type is Reject.
        Assert(type === 'Reject');
        // 2. Let handlerResult be ThrowCompletion(argument).
        handlerResult = ThrowCompletion(argument);
      }
    } else {
      // f. Else, let handlerResult be HostCallJobCallback(handler, undefined, « argument »).
      handlerResult = HostCallJobCallback(handler, Value.undefined, [argument]);
    }
    // g. If promiseCapability is undefined, then
    if (promiseCapability instanceof UndefinedValue) {
      // i. Assert: handlerResult is not an abrupt completion.
      Assert(!(handlerResult instanceof AbruptCompletion));
      // ii. AsyncContextSwap(previousContextMapping).
      AsyncContextSwap(previousContextMapping);
      // iii. Return NormalCompletion(empty).
      return NormalCompletion(undefined);
    }
    let resolvingFunctionResult;
    // h. If handlerResult is an abrupt completion, then
    if (handlerResult instanceof AbruptCompletion) {
      // i. Let resolvingFunctionResult be Completion(Call(promiseCapability.[[Reject]], undefined, « handlerResult.[[Value]] »)).
      resolvingFunctionResult = Completion(Call(promiseCapability.Reject, Value.undefined, [handlerResult.Value]));
    } else {
      // i. Let resolvingFunctionResult be Completion(Call(promiseCapability.[[Resolve]], undefined, « handlerResult.[[Value]] »)).
      resolvingFunctionResult = Completion(Call(promiseCapability.Resolve, Value.undefined, [handlerResult.Value]));
    }
    // k. AsyncContextSwap(previousContextMapping).
    AsyncContextSwap(previousContextMapping);
    // l. Return resolvingFunctionResult.
    return resolvingFunctionResult;
  };
  // 2. Let handlerRealm be null.
  let handlerRealm: NullValue | Realm = Value.null;
  // 3. If reaction.[[Handler]] is not empty, then
  if (reaction.Handler !== undefined) {
    // a. Let getHandlerRealmResult be GetFunctionRealm(reaction.[[Handler]].[[Callback]]).
    const getHandlerRealmResult = EnsureCompletion(GetFunctionRealm(reaction.Handler.Callback));
    // b. If getHandlerRealmResult is a normal completion, then set handlerRealm to getHandlerRealmResult.[[Value]].
    if (getHandlerRealmResult instanceof NormalCompletion) {
      handlerRealm = getHandlerRealmResult.Value;
    } else {
      // c. Else, set _handlerRealm_ to the current Realm Record.
      handlerRealm = surroundingAgent.currentRealmRecord;
    }
    // d. NOTE: _handlerRealm_ is never *null* unless the handler is *undefined*. When the handler
    //    is a revoked Proxy and no ECMAScript code runs, _handlerRealm_ is used to create error objects.
  }
  // 4. Return { [[Job]]: job, [[Realm]]: handlerRealm }.
  return { Job: job, Realm: handlerRealm };
}

/** https://tc39.es/ecma262/#sec-performpromisethen */
export function PerformPromiseThen(promise: PromiseObjectValue, onFulfilled: Value, onRejected: Value, resultCapability?: PromiseCapabilityRecord | UndefinedValue) {
  // 1. Assert: IsPromise(promise) is true.
  Assert(IsPromise(promise) === Value.true);
  // 2. If resultCapability is not present, then
  if (resultCapability === undefined) {
    // a. Set resultCapability to undefined.
    resultCapability = Value.undefined;
  }
  let onFulfilledJobCallback;
  // 3. If IsCallable(onFulfilled) is false, then
  if (IsCallable(onFulfilled) === Value.false) {
    // a. Let onFulfilledJobCallback be empty.
    onFulfilledJobCallback = undefined;
  } else { // 4. Else,
    // a. Let onFulfilledJobCallback be HostMakeJobCallback(onFulfilled).
    onFulfilledJobCallback = HostMakeJobCallback(onFulfilled);
  }
  let onRejectedJobCallback;
  // 5. If IsCallable(onRejected) is false, then
  if (IsCallable(onRejected) === Value.false) {
    // a. Let onRejectedJobCallback be empty.
    onRejectedJobCallback = undefined;
  } else { // 6. Else,
    onRejectedJobCallback = HostMakeJobCallback(onRejected);
  }
  // 7. Let snapshot be AsyncContextSnapshot();
  const snapshot = AsyncContextSnapshot();
  // 8. Let fulfillReaction be the PromiseReaction { [[Capability]]: resultCapability, [[Type]]: Fulfill, [[Handler]]: onFulfilled, [[PromiseAsyncContextSnapshot]]: snapshot }.
  const fulfillReaction = new PromiseReactionRecord({
    Capability: resultCapability,
    Type: 'Fulfill',
    Handler: onFulfilledJobCallback,
    PromiseAsyncContextSnapshot: snapshot,
  });
  // 9. Let rejectReaction be the PromiseReaction { [[Capability]]: resultCapability, [[Type]]: Reject, [[Handler]]: onRejected, [[PromiseAsyncContextSnapshot]]: snapshot }.
  const rejectReaction = new PromiseReactionRecord({
    Capability: resultCapability,
    Type: 'Reject',
    Handler: onRejectedJobCallback,
    PromiseAsyncContextSnapshot: snapshot,
  });
  // 10. If promise.[[PromiseState]] is pending, then
  if (promise.PromiseState === 'pending') {
    // a. Append fulfillReaction as the last element of the List that is promise.[[PromiseFulfillReactions]].
    promise.PromiseFulfillReactions!.push(fulfillReaction);
    // b. Append rejectReaction as the last element of the List that is promise.[[PromiseRejectReactions]].
    promise.PromiseRejectReactions!.push(rejectReaction);
  } else if (promise.PromiseState === 'fulfilled') {
    // a. Let value be promise.[[PromiseResult]].
    const value = promise.PromiseResult!;
    // b. Let fulfillJob be NewPromiseReactionJob(fulfillReaction, value).
    const fulfillJob = NewPromiseReactionJob(fulfillReaction, value);
    // c. Perform HostEnqueuePromiseJob(fulfillJob.[[Job]], fulfillJob.[[Realm]]).
    HostEnqueuePromiseJob(fulfillJob.Job, fulfillJob.Realm);
  } else {
    // a. Assert: The value of promise.[[PromiseState]] is rejected.
    Assert(promise.PromiseState === 'rejected');
    // b. Let reason be promise.[[PromiseResult]].
    const reason = promise.PromiseResult!;
    // c. If promise.[[PromiseIsHandled]] is false, perform HostPromiseRejectionTracker(promise, "handle").
    if (promise.PromiseIsHandled === Value.false) {
      HostPromiseRejectionTracker(promise, 'handle');
    }
    // d. Let rejectJob be NewPromiseReactionJob(rejectReaction, reason).
    const rejectJob = NewPromiseReactionJob(rejectReaction, reason);
    // e. Perform HostEnqueuePromiseJob(rejectJob.[[Job]], rejectJob.[[Realm]]).
    HostEnqueuePromiseJob(rejectJob.Job, rejectJob.Realm);
  }
  // 13. Set promise.[[PromiseIsHandled]] to true.
  promise.PromiseIsHandled = Value.true;
  // 14. If resultCapability is undefined, then
  if (resultCapability instanceof UndefinedValue) {
    // a. Return undefined.
    return Value.undefined;
  } else { // 15. Else,
    // a. Return resultCapability.[[Promise]].
    return resultCapability.Promise;
  }
}
