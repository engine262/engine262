import {
  EnqueueJob,
  HostPromiseRejectionTracker,
  surroundingAgent,
} from '../engine.mjs';
import { Type, Value } from '../value.mjs';
import {
  Assert,
  Call,
  Construct,
  CreateBuiltinFunction,
  Get,
  IsCallable,
  IsConstructor,
  IsPromise,
  SameValue,
  SetFunctionLength,
} from './all.mjs';
import {
  AbruptCompletion,
  NormalCompletion,
  Q,
  ThrowCompletion,
  EnsureCompletion,
} from '../completion.mjs';
import { msg } from '../helpers.mjs';

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

function GetCapabilitiesExecutorFunctions([resolve, reject]) {
  const F = this;

  const promiseCapability = F.Capability;
  if (Type(promiseCapability.Resolve) !== 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'Promise resolve function already set');
  }
  if (Type(promiseCapability.Reject) !== 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'Promise reject function already set');
  }
  promiseCapability.Resolve = resolve;
  promiseCapability.Reject = reject;
  return Value.undefined;
}

export class PromiseCapabilityRecord {
  constructor() {
    this.Promise = Value.undefined;
    this.Resolve = Value.undefined;
    this.Reject = Value.undefined;
  }
}

export function NewPromiseCapability(C) {
  if (IsConstructor(C) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('NotAConstructor', C));
  }
  const promiseCapability = new PromiseCapabilityRecord();
  const steps = GetCapabilitiesExecutorFunctions;
  const executor = CreateBuiltinFunction(steps, ['Capability']);
  SetFunctionLength(executor, new Value(2));
  executor.Capability = promiseCapability;
  const promise = Q(Construct(C, [executor]));
  if (IsCallable(promiseCapability.Resolve) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('PromiseResolveFunction', promiseCapability.Resolve));
  }
  if (IsCallable(promiseCapability.Reject) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('PromiseRejectFunction', promiseCapability.Reject));
  }
  promiseCapability.Promise = promise;
  return promiseCapability;
}

export function PromiseReactionJob(reaction, argument) {
  // Assert: reaction is a PromiseReaction Record.
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

function PromiseResolveTheableJob(promiseToResolve, thenable, then) {
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

function TriggerPromiseReactions(reactions, argument) {
  reactions.forEach((reaction) => {
    EnqueueJob('PromiseJobs', PromiseReactionJob, [reaction, argument]);
  });
  return Value.undefined;
}

function FulfillPromise(promise, value) {
  Assert(promise.PromiseState === 'pending');
  const reactions = promise.PromiseFulfillReactions;
  promise.PromiseResult = value;
  promise.PromiseFulfillReactions = undefined;
  promise.PromiseRejectReactions = undefined;
  promise.PromiseState = 'fulfilled';
  return TriggerPromiseReactions(reactions, value);
}

function RejectPromise(promise, reason) {
  Assert(promise.PromiseState === 'pending');
  const reactions = promise.PromiseRejectReactions;
  promise.PromiseResult = reason;
  promise.PromiseFulfillReactions = undefined;
  promise.PromiseRejectReactions = undefined;
  promise.PromiseState = 'rejected';
  if (promise.PromiseIsHandled === false) {
    HostPromiseRejectionTracker(promise, 'reject');
  }
  return TriggerPromiseReactions(reactions, reason);
}

function PromiseResolveFunctions([resolution]) {
  const F = this;

  Assert('Promise' in F && Type(F.Promise) === 'Object');
  const promise = F.Promise;
  const alreadyResolved = F.AlreadyResolved;
  if (alreadyResolved.Value === true) {
    return Value.undefined;
  }
  alreadyResolved.Value = true;
  if (SameValue(resolution, promise) === Value.true) {
    const selfResolutionError = surroundingAgent.Throw('TypeError', 'Cannot resolve a promise with itself').Value;
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
  EnqueueJob('PromiseJobs', PromiseResolveTheableJob, [promise, resolution, thenAction]);
  return Value.undefined;
}

function PromiseRejectFunctions([reason]) {
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

export function CreateResolvingFunctions(promise) {
  const alreadyResolved = { Value: false };
  const stepsResolve = PromiseResolveFunctions;
  const resolve = CreateBuiltinFunction(stepsResolve, ['Promise', 'AlreadyResolved']);
  SetFunctionLength(resolve, new Value(1));
  resolve.Promise = promise;
  resolve.AlreadyResolved = alreadyResolved;
  const stepsReject = PromiseRejectFunctions;
  const reject = CreateBuiltinFunction(stepsReject, ['Promise', 'AlreadyResolved']);
  SetFunctionLength(reject, new Value(1));
  reject.Promise = promise;
  reject.AlreadyResolved = alreadyResolved;
  return {
    Resolve: resolve,
    Reject: reject,
  };
}

// #sec-performpromisethen
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
  const fulfillReaction = {
    Capability: resultCapability,
    Type: 'Fulfill',
    Handler: onFulfilled,
  };
  const rejectReaction = {
    Capability: resultCapability,
    Type: 'Reject',
    Handler: onRejected,
  };
  if (promise.PromiseState === 'pending') {
    promise.PromiseFulfillReactions.push(fulfillReaction);
    promise.PromiseRejectReactions.push(rejectReaction);
  } else if (promise.PromiseState === 'fulfilled') {
    const value = promise.PromiseResult;
    EnqueueJob('PromiseJobs', PromiseReactionJob, [fulfillReaction, value]);
  } else {
    Assert(promise.PromiseState === 'rejected');
    const reason = promise.PromiseResult;
    if (promise.PromiseIsHandled === false) {
      HostPromiseRejectionTracker(promise, 'handler');
    }
    EnqueueJob('PromiseJobs', PromiseReactionJob, [rejectReaction, reason]);
  }
  promise.PromiseIsHandled = true;
  if (resultCapability === Value.undefined) {
    return Value.undefined;
  } else {
    return resultCapability.Promise;
  }
}
