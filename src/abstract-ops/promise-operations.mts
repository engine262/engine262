import {
  HostMakeJobCallback,
  HostCallJobCallback,
  HostEnqueuePromiseJob,
  HostPromiseRejectionTracker,
  surroundingAgent,
} from '../host-defined/engine.mts';
import {
  ObjectValue, Value, UndefinedValue, BooleanValue, NullValue, type Arguments,
} from '../value.mts';
import {
  AbruptCompletion,
  EnsureCompletion,
  NormalCompletion,
  Q,
  ThrowCompletion,
  X,
} from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import type { PlainEvaluator } from '../evaluator.mts';
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
  type BuiltinFunctionObject,
  Realm,
} from './all.mts';
import type {
  ValueEvaluator, JobCallbackRecord, PromiseObject,
  ValueCompletion,
} from '#self';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-promise-objects */

export interface PromiseResolvingFunctionObject extends BuiltinFunctionObject {
  readonly Promise: PromiseObject;
  readonly AlreadyResolved: { Value: boolean };
}

/** https://tc39.es/ecma262/#sec-promise.all-resolve-element-functions */
export interface PromiseAllResolveElementFunctionObject extends BuiltinFunctionObject {
  readonly Index: number;
  readonly AlreadyCalled: { Value: boolean };
}

/** https://tc39.es/ecma262/#sec-promise.any-reject-element-functions */
export interface PromiseAllRejectElementFunctionObject extends BuiltinFunctionObject {
  readonly Index: number;
  readonly AlreadyCalled: { Value: boolean };
}

/** https://tc39.es/ecma262/#sec-promisecapability-records */
export class PromiseCapabilityRecord {
  readonly Promise!: PromiseObject;

  readonly Resolve: Value = Value.undefined;

  readonly Reject: Value = Value.undefined;
}

/** https://tc39.es/ecma262/#sec-promisereaction-records */
export class PromiseReactionRecord {
  readonly Capability: PromiseCapabilityRecord | UndefinedValue;

  readonly Type: 'Fulfill' | 'Reject';

  readonly Handler: JobCallbackRecord | undefined;

  constructor(O: PromiseReactionRecord) {
    Assert(O.Capability instanceof PromiseCapabilityRecord
        || O.Capability === Value.undefined);
    Assert(O.Type === 'Fulfill' || O.Type === 'Reject');
    Assert(O.Handler === undefined
           || isFunctionObject(O.Handler.Callback));
    this.Capability = O.Capability;
    this.Type = O.Type;
    this.Handler = O.Handler;
  }
}

/** https://tc39.es/ecma262/#sec-createresolvingfunctions */
export function CreateResolvingFunctions(promise: PromiseObject) {
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
function PromiseRejectFunctions(this: BuiltinFunctionObject, [reason = Value.undefined]: Arguments): ValueCompletion<UndefinedValue> {
  const F = this as PromiseResolvingFunctionObject;

  Assert('Promise' in F && F.Promise instanceof ObjectValue);
  const promise = F.Promise;
  const alreadyResolved = F.AlreadyResolved;
  if (alreadyResolved.Value === true) {
    return Value.undefined;
  }
  Q(surroundingAgent.debugger_tryTouchDuringPreview(promise));
  alreadyResolved.Value = true;
  return RejectPromise(promise, reason);
}

/** https://tc39.es/ecma262/#sec-newpromiseresolvethenablejob */
function NewPromiseResolveThenableJob(promiseToResolve: PromiseObject, thenable: Value, then: JobCallbackRecord) {
  // 1. Let job be a new Job abstract closure with no parameters that captures
  //    promiseToResolve, thenable, and then and performs the following steps when called:
  function* job() {
    // a. Let resolvingFunctions be CreateResolvingFunctions(promiseToResolve).
    const resolvingFunctions = CreateResolvingFunctions(promiseToResolve);
    // b. Let thenCallResult be HostCallJobCallback(then, thenable, « resolvingFunctions.[[Resolve]], resolvingFunctions.[[Reject]] »).
    const thenCallResult = yield* HostCallJobCallback(then, thenable, [resolvingFunctions.Resolve, resolvingFunctions.Reject]);
    // c. If thenCallResult is an abrupt completion, then
    if (thenCallResult instanceof AbruptCompletion) {
      // i .Let status be Call(resolvingFunctions.[[Reject]], undefined, « thenCallResult.[[Value]] »).
      const status = yield* Call(resolvingFunctions.Reject, Value.undefined, [thenCallResult.Value]);
      // ii. Return Completion(status).
      return status;
    }
    // d. Return Completion(thenCallResult).
    return EnsureCompletion(thenCallResult);
  }
  // 2. Let getThenRealmResult be GetFunctionRealm(then.[[Callback]]).
  const getThenRealmResult = EnsureCompletion(GetFunctionRealm(then.Callback));
  // 3. If getThenRealmResult is a normal completion, then let thenRealm be getThenRealmResult.[[Value]].
  let thenRealm;
  if (getThenRealmResult instanceof NormalCompletion) {
    thenRealm = getThenRealmResult.Value;
  } else {
    // 4. Else, let _thenRealm_ be the current Realm Record.
    thenRealm = surroundingAgent.currentRealmRecord;
  }
  // 5. NOTE: _thenRealm_ is never *null*. When _then_.[[Callback]] is a revoked Proxy and no code runs, _thenRealm_ is used to create error objects.
  // 6. Return { [[Job]]: job, [[Realm]]: thenRealm }.
  return { Job: job, Realm: thenRealm };
}

/** https://tc39.es/ecma262/#sec-promise-resolve-functions */
function* PromiseResolveFunctions(this: BuiltinFunctionObject, [resolution = Value.undefined]: Arguments): ValueEvaluator {
  // 1. Let F be the active function object.
  const F = this as PromiseResolvingFunctionObject;
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
  Q(surroundingAgent.debugger_tryTouchDuringPreview(promise));
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
  const then = EnsureCompletion(yield* Get(resolution, Value('then')));
  // 10. If then is an abrupt completion, then
  if (then instanceof AbruptCompletion) {
    // a. Return RejectPromise(promise, then.[[Value]]).
    return RejectPromise(promise, then.Value);
  }
  // 11. Let thenAction be then.[[Value]].
  const thenAction = then.Value;
  // 12. If IsCallable(thenAction) is false, then
  if (!IsCallable(thenAction)) {
    // a. Return FulfillPromise(promise, resolution).
    return FulfillPromise(promise, resolution);
  }
  if (surroundingAgent.debugger_isPreviewing) {
    return Value.undefined;
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
function FulfillPromise(promise: PromiseObject, value: Value) {
  Assert(promise.PromiseState === 'pending');
  const reactions = promise.PromiseFulfillReactions;
  promise.PromiseResult = value;
  promise.PromiseFulfillReactions = undefined;
  promise.PromiseRejectReactions = undefined;
  promise.PromiseState = 'fulfilled';
  return TriggerPromiseReactions(reactions!, value);
}

/** https://tc39.es/ecma262/#sec-newpromisecapability */
export function* NewPromiseCapability(C: Value): PlainEvaluator<PromiseCapabilityRecord> {
  // 1. If IsConstructor(C) is false, throw a TypeError exception.
  if (!IsConstructor(C)) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', C);
  }
  // 2. NOTE: C is assumed to be a constructor function that supports the parameter conventions of the Promise constructor (see 26.2.3.1).
  // 3. Let promiseCapability be the PromiseCapability Record { [[Promise]]: undefined, [[Resolve]]: undefined, [[Reject]]: undefined }.
  const promiseCapability = new PromiseCapabilityRecord() as Mutable<PromiseCapabilityRecord>;
  // 4. Let executorClosure be a new Abstract Closure with parameters (resolve, reject) that captures promiseCapability and performs the following steps when called:
  const executorClosure = ([resolve = Value.undefined, reject = Value.undefined]: Arguments) => {
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
  const promise = Q(yield* Construct(C, [executor])) as PromiseObject;
  // 9. If IsCallable(promiseCapability.[[Resolve]]) is false, throw a TypeError exception.
  if (!IsCallable(promiseCapability.Resolve)) {
    return surroundingAgent.Throw('TypeError', 'PromiseResolveFunction', promiseCapability.Resolve);
  }
  // 10. If IsCallable(promiseCapability.[[Reject]]) is false, throw a TypeError exception.
  if (!IsCallable(promiseCapability.Reject)) {
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
function RejectPromise(promise: PromiseObject, reason: Value) {
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
export function* PromiseResolve(C: ObjectValue, x: Value): ValueEvaluator<PromiseObject> {
  Assert(C instanceof ObjectValue);
  if (IsPromise(x) === Value.true) {
    const xConstructor = Q(yield* Get(x as PromiseObject, Value('constructor')));
    if (SameValue(xConstructor, C) === Value.true) {
      return x as PromiseObject;
    }
  }
  const promiseCapability = Q(yield* NewPromiseCapability(C));
  Q(yield* Call(promiseCapability.Resolve, Value.undefined, [x]));
  return promiseCapability.Promise;
}

/** https://tc39.es/ecma262/#sec-newpromisereactionjob */
function NewPromiseReactionJob(reaction: PromiseReactionRecord, argument: Value) {
  // 1. Let job be a new Job abstract closure with no parameters that captures
  //    reaction and argument and performs the following steps when called:
  function* job() {
    // a. Assert: reaction is a PromiseReaction Record.
    Assert(reaction instanceof PromiseReactionRecord);
    // b. Let promiseCapability be reaction.[[Capability]].
    const promiseCapability = reaction.Capability;
    // c. Let type be reaction.[[Type]].
    const type = reaction.Type;
    // d. Let handler be reaction.[[Handler]].
    const handler = reaction.Handler;
    let handlerResult: ValueCompletion;
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
      handlerResult = yield* HostCallJobCallback(handler, Value.undefined, [argument]);
    }
    // g. If promiseCapability is undefined, then
    if (promiseCapability instanceof UndefinedValue) {
      // i. Assert: handlerResult is not an abrupt completion.
      Assert(!(handlerResult instanceof AbruptCompletion));
      // ii. Return NormalCompletion(empty).
      return NormalCompletion(undefined);
    }
    let status;
    // h. If handlerResult is an abrupt completion, then
    if (handlerResult instanceof AbruptCompletion) {
      // i. Let status be Call(promiseCapability.[[Reject]], undefined, « handlerResult.[[Value]] »).
      status = yield* Call(promiseCapability.Reject, Value.undefined, [handlerResult.Value]);
    } else {
      // ii. Let status be Call(promiseCapability.[[Resolve]], undefined, « handlerResult.[[Value]] »).
      status = yield* Call(promiseCapability.Resolve, Value.undefined, [X(handlerResult)]);
    }
    // j. Return Completion(status).
    return status;
  }
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
export function PerformPromiseThen(promise: PromiseObject, onFulfilled: Value, onRejected: Value, resultCapability?: PromiseCapabilityRecord | UndefinedValue) {
  // 1. Assert: IsPromise(promise) is true.
  Assert(IsPromise(promise) === Value.true);
  // 2. If resultCapability is not present, then
  if (resultCapability === undefined) {
    // a. Set resultCapability to undefined.
    resultCapability = Value.undefined;
  }
  let onFulfilledJobCallback;
  // 3. If IsCallable(onFulfilled) is false, then
  if (!IsCallable(onFulfilled)) {
    // a. Let onFulfilledJobCallback be empty.
    onFulfilledJobCallback = undefined;
  } else { // 4. Else,
    // a. Let onFulfilledJobCallback be HostMakeJobCallback(onFulfilled).
    onFulfilledJobCallback = HostMakeJobCallback(onFulfilled);
  }
  let onRejectedJobCallback;
  // 5. If IsCallable(onRejected) is false, then
  if (!IsCallable(onRejected)) {
    // a. Let onRejectedJobCallback be empty.
    onRejectedJobCallback = undefined;
  } else { // 6. Else,
    onRejectedJobCallback = HostMakeJobCallback(onRejected);
  }
  // 7. Let fulfillReaction be the PromiseReaction { [[Capability]]: resultCapability, [[Type]]: Fulfill, [[Handler]]: onFulfilled }.
  const fulfillReaction = new PromiseReactionRecord({
    Capability: resultCapability,
    Type: 'Fulfill',
    Handler: onFulfilledJobCallback,
  });
  // 8. Let rejectReaction be the PromiseReaction { [[Capability]]: resultCapability, [[Type]]: Reject, [[Handler]]: onRejected }.
  const rejectReaction = new PromiseReactionRecord({
    Capability: resultCapability,
    Type: 'Reject',
    Handler: onRejectedJobCallback,
  });
  // 9. If promise.[[PromiseState]] is pending, then
  if (promise.PromiseState === 'pending') {
    surroundingAgent.debugger_tryTouchDuringPreview(promise);
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
  // 12. Set promise.[[PromiseIsHandled]] to true.
  promise.PromiseIsHandled = Value.true;
  // 13. If resultCapability is undefined, then
  if (resultCapability instanceof UndefinedValue) {
    // a. Return undefined.
    return Value.undefined;
  } else { // 14. Else,
    // a. Return resultCapability.[[Promise]].
    return resultCapability.Promise;
  }
}
