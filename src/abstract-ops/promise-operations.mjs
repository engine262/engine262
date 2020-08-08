import {
  HostEnqueuePromiseJob,
  HostPromiseRejectionTracker,
  surroundingAgent,
} from '../engine.mjs';
import { Type, Value } from '../value.mjs';
import {
  Completion,
  AbruptCompletion,
  NormalCompletion,
  Q,
  X,
  ThrowCompletion,
} from '../completion.mjs';
import {
  Assert,
  Call,
  Construct,
  CreateBuiltinFunction,
  Get,
  IsCallable,
  IsConstructor,
  SameValue,
  SetFunctionLength,
  SetFunctionName,
  GetFunctionRealm,
  isFunctionObject,
} from './all.mjs';

// This file covers abstract operations defined in
// 25.6 #sec-promise-objects

// 25.6.1.1 #sec-promisecapability-records
export class PromiseCapabilityRecord {
  constructor() {
    this.Promise = Value.undefined;
    this.Resolve = Value.undefined;
    this.Reject = Value.undefined;
  }
}

// 25.6.1.2 #sec-promisereaction-records
export class PromiseReactionRecord {
  constructor(O) {
    Assert(O.Capability instanceof PromiseCapabilityRecord
        || O.Capability === Value.undefined);
    Assert(O.Type === 'Fulfill' || O.Type === 'Reject');
    Assert(O.Handler === Value.undefined
           || isFunctionObject(O.Handler));
    this.Capability = O.Capability;
    this.Type = O.Type;
    this.Handler = O.Handler;
  }
}

// 25.6.1.3 #sec-createresolvingfunctions
export function CreateResolvingFunctions(promise) {
  const alreadyResolved = { Value: false };
  const stepsResolve = PromiseResolveFunctions;
  const resolve = X(CreateBuiltinFunction(stepsResolve, ['Promise', 'AlreadyResolved']));
  SetFunctionLength(resolve, new Value(1));
  SetFunctionName(resolve, new Value(''));
  resolve.Promise = promise;
  resolve.AlreadyResolved = alreadyResolved;
  const stepsReject = PromiseRejectFunctions;
  const reject = X(CreateBuiltinFunction(stepsReject, ['Promise', 'AlreadyResolved']));
  SetFunctionLength(reject, new Value(1));
  SetFunctionName(reject, new Value(''));
  reject.Promise = promise;
  reject.AlreadyResolved = alreadyResolved;
  return {
    Resolve: resolve,
    Reject: reject,
  };
}

// 25.6.1.3.1 #sec-promise-reject-functions
function PromiseRejectFunctions([reason = Value.undefined]) {
  const F = this;

  Assert('Promise' in F && Type(F.Promise) === 'Object');
  const promise = F.Promise;
  const alreadyResolved = F.AlreadyResolved;
  if (alreadyResolved.Value === true) {
    return Value.undefined;
  }
  alreadyResolved.Value = true;
  return RejectPromise(promise, reason);
}

// #sec-newpromiseresolvethenablejob
function NewPromiseResolveThenableJob(promiseToResolve, thenable, then) {
  // 1. Let job be a new Job abstract closure with no parameters that captures
  //    promiseToResolve, thenable, and then and performs the following steps when called:
  const job = () => {
    // a. Let resolvingFunctions be CreateResolvingFunctions(promiseToResolve).
    const resolvingFunctions = CreateResolvingFunctions(promiseToResolve);
    // b. Let thenCallResult be Call(then, thenable, « resolvingFunctions.[[Resolve]], resolvingFunctions.[[Reject]] »).
    const thenCallResult = Call(then, thenable, [resolvingFunctions.Resolve, resolvingFunctions.Reject]);
    // c. If thenCallResult is an abrupt completion, then
    if (thenCallResult instanceof AbruptCompletion) {
      // i .Let status be Call(resolvingFunctions.[[Reject]], undefined, « thenCallResult.[[Value]] »).
      const status = Call(resolvingFunctions.Reject, Value.undefined, [thenCallResult.Value]);
      // ii. Return Completion(status).
      return Completion(status);
    }
    // d. Return Completion(thenCallResult).
    return Completion(thenCallResult);
  };
  // 2. Let getThenRealmResult be GetFunctionRealm(then).
  const getThenRealmResult = GetFunctionRealm(then);
  // 3. If getThenRealmResult is a normal completion, then let thenRealm be getThenRealmResult.[[Value]].
  let thenRealm;
  if (getThenRealmResult instanceof NormalCompletion) {
    thenRealm = getThenRealmResult.Value;
  } else {
    // 4. Else, let _thenRealm_ be the current Realm Record.
    thenRealm = surroundingAgent.currentRealmRecord;
  }
  // 5. NOTE: _thenRealm_ is never *null*. When _then_ is a revoked Proxy and no code runs, _thenRealm_ is used to create error objects.
  // 6. Return { [[Job]]: job, [[Realm]]: thenRealm }.
  return { Job: job, Realm: thenRealm };
}

// 25.6.1.3.2 #sec-promise-resolve-functions
function PromiseResolveFunctions([resolution = Value.undefined]) {
  const F = this;

  Assert('Promise' in F && Type(F.Promise) === 'Object');
  const promise = F.Promise;
  const alreadyResolved = F.AlreadyResolved;
  if (alreadyResolved.Value === true) {
    return Value.undefined;
  }
  alreadyResolved.Value = true;
  if (SameValue(resolution, promise) === Value.true) {
    const selfResolutionError = surroundingAgent.Throw('TypeError', 'CannotResolvePromiseWithItself').Value;
    return RejectPromise(promise, selfResolutionError);
  }
  if (Type(resolution) !== 'Object') {
    return FulfillPromise(promise, resolution);
  }

  const then = Get(resolution, new Value('then'));
  if (then instanceof AbruptCompletion) {
    return RejectPromise(promise, then.Value);
  }
  const thenAction = then.Value;
  if (IsCallable(thenAction) === Value.false) {
    return FulfillPromise(promise, resolution);
  }
  const job = NewPromiseResolveThenableJob(promise, resolution, thenAction);
  HostEnqueuePromiseJob(job.Job, job.Realm);
  return Value.undefined;
}

// 25.6.1.4 #sec-fulfillpromise
function FulfillPromise(promise, value) {
  Assert(promise.PromiseState === 'pending');
  const reactions = promise.PromiseFulfillReactions;
  promise.PromiseResult = value;
  promise.PromiseFulfillReactions = undefined;
  promise.PromiseRejectReactions = undefined;
  promise.PromiseState = 'fulfilled';
  return TriggerPromiseReactions(reactions, value);
}

// 25.6.1.5 #sec-newpromisecapability
export function NewPromiseCapability(C) {
  if (IsConstructor(C) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', C);
  }
  const promiseCapability = new PromiseCapabilityRecord();
  const steps = GetCapabilitiesExecutorFunctions;
  const executor = X(CreateBuiltinFunction(steps, ['Capability']));
  SetFunctionLength(executor, new Value(2));
  SetFunctionName(executor, new Value(''));
  executor.Capability = promiseCapability;
  const promise = Q(Construct(C, [executor]));
  if (IsCallable(promiseCapability.Resolve) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'PromiseResolveFunction', promiseCapability.Resolve);
  }
  if (IsCallable(promiseCapability.Reject) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'PromiseRejectFunction', promiseCapability.Reject);
  }
  promiseCapability.Promise = promise;
  return promiseCapability;
}

// 25.6.1.5.1 #sec-getcapabilitiesexecutor-functions
function GetCapabilitiesExecutorFunctions([resolve = Value.undefined, reject = Value.undefined]) {
  const F = this;

  const promiseCapability = F.Capability;
  if (Type(promiseCapability.Resolve) !== 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'PromiseCapabilityFunctionAlreadySet', 'resolve');
  }
  if (Type(promiseCapability.Reject) !== 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'PromiseCapabilityFunctionAlreadySet', 'reject');
  }
  promiseCapability.Resolve = resolve;
  promiseCapability.Reject = reject;
  return Value.undefined;
}

// 25.6.1.6 #sec-ispromise
export function IsPromise(x) {
  if (Type(x) !== 'Object') {
    return Value.false;
  }
  if (!('PromiseState' in x)) {
    return Value.false;
  }
  return Value.true;
}

// 25.6.1.7 #sec-rejectpromise
function RejectPromise(promise, reason) {
  Assert(promise.PromiseState === 'pending');
  const reactions = promise.PromiseRejectReactions;
  promise.PromiseResult = reason;
  promise.PromiseFulfillReactions = undefined;
  promise.PromiseRejectReactions = undefined;
  promise.PromiseState = 'rejected';
  if (promise.PromiseIsHandled === Value.false) {
    HostPromiseRejectionTracker(promise, 'reject');
  }
  return TriggerPromiseReactions(reactions, reason);
}

// #sec-triggerpromisereactions
function TriggerPromiseReactions(reactions, argument) {
  // 1. For each reaction in reactions, in original insertion order, do
  reactions.forEach((reaction) => {
    // a. Let job be NewPromiseReactionJob(reaction, argument).
    const job = NewPromiseReactionJob(reaction, argument);
    // b. Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]]).
    HostEnqueuePromiseJob(job.Job, job.Realm);
  });
  // 2. Return undefined.
  return Value.undefined;
}

// 25.6.4.5.1 #sec-promise-resolve
export function PromiseResolve(C, x) {
  Assert(Type(C) === 'Object');
  if (IsPromise(x) === Value.true) {
    const xConstructor = Q(Get(x, new Value('constructor')));
    if (SameValue(xConstructor, C) === Value.true) {
      return x;
    }
  }
  const promiseCapability = Q(NewPromiseCapability(C));
  Q(Call(promiseCapability.Resolve, Value.undefined, [x]));
  return promiseCapability.Promise;
}

// #sec-newpromisereactionjob
function NewPromiseReactionJob(reaction, argument) {
  // 1. Let job be a new Job abstract closure with no parameters that captures
  //    reaction and argument and performs the following steps when called:
  const job = () => {
    // a. Assert: reaction is a PromiseReaction Record.
    Assert(reaction instanceof PromiseReactionRecord);
    // b. Let promiseCapability be reaction.[[Capability]].
    const promiseCapability = reaction.Capability;
    // c. Let type be reaction.[[Type]].
    const type = reaction.Type;
    // d. Let handler be reaction.[[Handler]].
    const handler = reaction.Handler;
    let handlerResult;
    // e. If handler is undefined, then
    if (handler === Value.undefined) {
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
      // f. let handlerResult be Call(handler, undefined, « argument »).
      handlerResult = Call(handler, Value.undefined, [argument]);
    }
    // g. If promiseCapability is undefined, then
    if (promiseCapability === Value.undefined) {
      // i. Assert: handlerResult is not an abrupt completion.
      Assert(!(handlerResult instanceof AbruptCompletion));
      // ii. Return NormalCompletion(empty).
      return NormalCompletion(undefined);
    }
    let status;
    // h. If handlerResult is an abrupt completion, then
    if (handlerResult instanceof AbruptCompletion) {
      // i. Let status be Call(promiseCapability.[[Reject]], undefined, « handlerResult.[[Value]] »).
      status = Call(promiseCapability.Reject, Value.undefined, [handlerResult.Value]);
    } else {
      // ii. Let status be Call(promiseCapability.[[Resolve]], undefined, « handlerResult.[[Value]] »).
      status = Call(promiseCapability.Resolve, Value.undefined, [handlerResult.Value]);
    }
    // j. Return Completion(status).
    return Completion(status);
  };
  // 2. Let handlerRealm be null.
  let handlerRealm = Value.null;
  // 3. If reaction.[[Handler]] is not undefined, then
  if (reaction.Handler !== Value.undefined) {
    // a. Let getHandlerRealmResult be GetFunctionRealm(handler).
    const getHandlerRealmResult = GetFunctionRealm(reaction.Handler);
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

// 25.6.5.4.1 #sec-performpromisethen
export function PerformPromiseThen(promise, onFulfilled, onRejected, resultCapability) {
  // 1. Assert: IsPromise(promise) is true.
  Assert(IsPromise(promise) === Value.true);
  // 2. If resultCapability is present, then
  if (resultCapability) {
    // a. Assert: resultCapability is a PromiseCapability Record.
    Assert(resultCapability instanceof PromiseCapabilityRecord);
  } else {
    // a. Set resultCapability to undefined.
    resultCapability = Value.undefined;
  }
  // 4. If IsCallable(onFulfilled) is false, then
  if (IsCallable(onFulfilled) === Value.false) {
    // a. Set onFulfilled to undefined.
    onFulfilled = Value.undefined;
  }
  // 5. If IsCallable(onRejected) is false, then
  if (IsCallable(onRejected) === Value.false) {
    // a. Set onRejected to undefined.
    onRejected = Value.undefined;
  }
  // 6. Let fulfillReaction be the PromiseReaction { [[Capability]]: resultCapability, [[Type]]: Fulfill, [[Handler]]: onFulfilled }.
  const fulfillReaction = new PromiseReactionRecord({
    Capability: resultCapability,
    Type: 'Fulfill',
    Handler: onFulfilled,
  });
  // 7. Let rejectReaction be the PromiseReaction { [[Capability]]: resultCapability, [[Type]]: Reject, [[Handler]]: onRejected }.
  const rejectReaction = new PromiseReactionRecord({
    Capability: resultCapability,
    Type: 'Reject',
    Handler: onRejected,
  });
  // 8. If promise.[[PromiseState]] is pending, then
  if (promise.PromiseState === 'pending') {
    // a. Append fulfillReaction as the last element of the List that is promise.[[PromiseFulfillReactions]].
    promise.PromiseFulfillReactions.push(fulfillReaction);
    // b. Append rejectReaction as the last element of the List that is promise.[[PromiseRejectReactions]].
    promise.PromiseRejectReactions.push(rejectReaction);
  } else if (promise.PromiseState === 'fulfilled') {
    // a. Let value be promise.[[PromiseResult]].
    const value = promise.PromiseResult;
    // b. Let fulfillJob be NewPromiseReactionJob(fulfillReaction, value).
    const fulfillJob = NewPromiseReactionJob(fulfillReaction, value);
    // c. Perform HostEnqueuePromiseJob(fulfillJob.[[Job]], fulfillJob.[[Realm]]).
    HostEnqueuePromiseJob(fulfillJob.Job, fulfillJob.Realm);
  } else {
    // a. Assert: The value of promise.[[PromiseState]] is rejected.
    Assert(promise.PromiseState === 'rejected');
    // b. Let reason be promise.[[PromiseResult]].
    const reason = promise.PromiseResult;
    // c. If promise.[[PromiseIsHandled]] is false, perform HostPromiseRejectionTracker(promise, "handle").
    if (promise.PromiseIsHandled === Value.false) {
      HostPromiseRejectionTracker(promise, 'handle');
    }
    // d. Let rejectJob be NewPromiseReactionJob(rejectReaction, reason).
    const rejectJob = NewPromiseReactionJob(rejectReaction, reason);
    // e. Perform HostEnqueuePromiseJob(rejectJob.[[Job]], rejectJob.[[Realm]]).
    HostEnqueuePromiseJob(rejectJob.Job, rejectJob.Realm);
  }
  // 11. Set promise.[[PromiseIsHandled]] to true.
  promise.PromiseIsHandled = Value.true;
  // 12. If resultCapability is undefined, then
  if (resultCapability === Value.undefined) {
    // a. Return undefined.
    return Value.undefined;
  } else {
    // return resultCapability.[[Promise]].
    return resultCapability.Promise;
  }
}
