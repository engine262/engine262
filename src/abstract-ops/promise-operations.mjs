import {
  EnqueueJob,
  HostPromiseRejectionTracker,
  surroundingAgent,
} from '../engine.mjs';
import { FunctionValue, Type, Value } from '../value.mjs';
import {
  AbruptCompletion,
  NormalCompletion,
  Q,
  X,
  ThrowCompletion,
  EnsureCompletion,
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

  mark(m) {
    m(this.Promise);
    m(this.Resolve);
    m(this.Reject);
  }
}

// 25.6.1.2 #sec-promisereaction-records
export class PromiseReactionRecord {
  constructor(O) {
    Assert(O.Capability instanceof PromiseCapabilityRecord
        || O.Capability === Value.undefined);
    Assert(O.Type === 'Fulfill' || O.Type === 'Reject');
    Assert(O.Handler instanceof FunctionValue
        || O.Handler === Value.undefined);
    this.Capability = O.Capability;
    this.Type = O.Type;
    this.Handler = O.Handler;
  }

  mark(m) {
    m(this.Capability);
    m(this.Handler);
  }
}

// 25.6.1.3 #sec-createresolvingfunctions
export function CreateResolvingFunctions(promise) {
  const alreadyResolved = { Value: false };
  const stepsResolve = PromiseResolveFunctions;
  const resolve = X(CreateBuiltinFunction(stepsResolve, ['Promise', 'AlreadyResolved']));
  SetFunctionLength(resolve, new Value(1));
  resolve.Promise = promise;
  resolve.AlreadyResolved = alreadyResolved;
  const stepsReject = PromiseRejectFunctions;
  const reject = X(CreateBuiltinFunction(stepsReject, ['Promise', 'AlreadyResolved']));
  SetFunctionLength(reject, new Value(1));
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
  EnqueueJob('PromiseJobs', PromiseResolveThenableJob, [promise, resolution, thenAction]);
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

// 25.6.1.8 #sec-triggerpromisereactions
function TriggerPromiseReactions(reactions, argument) {
  reactions.forEach((reaction) => {
    EnqueueJob('PromiseJobs', PromiseReactionJob, [reaction, argument]);
  });
  return Value.undefined;
}

// 25.6.2.1 #sec-promisereactionjob
export function PromiseReactionJob(reaction, argument) {
  Assert(reaction instanceof PromiseReactionRecord);
  const promiseCapability = reaction.Capability;
  const type = reaction.Type;
  const handler = reaction.Handler;
  let handlerResult;
  if (handler === Value.undefined) {
    if (type === 'Fulfill') {
      handlerResult = new NormalCompletion(argument);
    } else {
      Assert(type === 'Reject');
      handlerResult = new ThrowCompletion(argument);
    }
  } else {
    handlerResult = Call(handler, Value.undefined, [argument]);
  }
  if (promiseCapability === Value.undefined) {
    Assert(!(handlerResult instanceof AbruptCompletion));
    return new NormalCompletion(undefined);
  }
  let status;
  if (handlerResult instanceof AbruptCompletion) {
    status = Call(promiseCapability.Reject, Value.undefined, [handlerResult.Value]);
  } else {
    status = Call(promiseCapability.Resolve, Value.undefined, [EnsureCompletion(handlerResult).Value]);
  }
  return status;
}

// 25.6.2.2 #sec-promiseresolvethenablejob
function PromiseResolveThenableJob(promiseToResolve, thenable, then) {
  const resolvingFunctions = CreateResolvingFunctions(promiseToResolve);
  const thenCallResult = Call(then, thenable, [
    resolvingFunctions.Resolve, resolvingFunctions.Reject,
  ]);
  if (thenCallResult instanceof AbruptCompletion) {
    const status = Call(resolvingFunctions.Reject, Value.undefined, [thenCallResult.Value]);
    return status;
  }
  return thenCallResult;
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

// 25.6.5.4.1 #sec-performpromisethen
export function PerformPromiseThen(promise, onFulfilled, onRejected, resultCapability) {
  Assert(IsPromise(promise) === Value.true);
  if (resultCapability) {
    Assert(resultCapability instanceof PromiseCapabilityRecord);
  } else {
    resultCapability = Value.undefined;
  }
  if (IsCallable(onFulfilled) === Value.false) {
    onFulfilled = Value.undefined;
  }
  if (IsCallable(onRejected) === Value.false) {
    onRejected = Value.undefined;
  }
  const fulfillReaction = new PromiseReactionRecord({
    Capability: resultCapability,
    Type: 'Fulfill',
    Handler: onFulfilled,
  });
  const rejectReaction = new PromiseReactionRecord({
    Capability: resultCapability,
    Type: 'Reject',
    Handler: onRejected,
  });
  if (promise.PromiseState === 'pending') {
    promise.PromiseFulfillReactions.push(fulfillReaction);
    promise.PromiseRejectReactions.push(rejectReaction);
  } else if (promise.PromiseState === 'fulfilled') {
    const value = promise.PromiseResult;
    EnqueueJob('PromiseJobs', PromiseReactionJob, [fulfillReaction, value]);
  } else {
    Assert(promise.PromiseState === 'rejected');
    const reason = promise.PromiseResult;
    if (promise.PromiseIsHandled === Value.false) {
      HostPromiseRejectionTracker(promise, 'handle');
    }
    EnqueueJob('PromiseJobs', PromiseReactionJob, [rejectReaction, reason]);
  }
  promise.PromiseIsHandled = Value.true;
  if (resultCapability === Value.undefined) {
    return Value.undefined;
  } else {
    return resultCapability.Promise;
  }
}
