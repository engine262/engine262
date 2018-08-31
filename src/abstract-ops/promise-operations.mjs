import {
  surroundingAgent,
  HostPromiseRejectionTracker,
  EnqueueJob,
} from '../engine.mjs';
import {
  Type,
  New as NewValue,
} from '../value.mjs';
import {
  Assert,
  SameValue,
  IsPromise,
  Call,
  IsConstructor,
  Get,
  IsCallable,
  CreateBuiltinFunction,
  Construct,
  SetFunctionLength,
} from './all.mjs';
import {
  Q,
  NormalCompletion,
  AbruptCompletion,
  ThrowCompletion,
} from '../completion.mjs';

export function PromiseResolve(C, x) {
  Assert(Type(C) === 'Object');
  if (IsPromise(x).isTrue()) {
    const xConstructor = Q(Get(x, NewValue('constructor')));
    if (SameValue(xConstructor, C)) {
      return x;
    }
  }
  const promiseCapability = NewPromiseCapability(C);
  Q(Call(promiseCapability.Resolve, NewValue(undefined), [x]));
  return promiseCapability.Promise;
}

function GetCapabilitiesExecutorFunctions(realm, [resolve, reject]) {
  const F = this;

  const promiseCapability = F.Capability;
  if (promiseCapability.Resolve !== undefined) {
    return surroundingAgent.Throw('TypeError');
  }
  if (promiseCapability.Reject !== undefined) {
    return surroundingAgent.Throw('TypeError');
  }
  promiseCapability.Resolve = resolve;
  promiseCapability.Reject = reject;
  return NewValue(undefined);
}

export class PromiseCapabilityRecord {
  constructor() {
    this.Promise = undefined;
    this.Resolve = undefined;
    this.Reject = undefined;
  }
}

export function NewPromiseCapability(C) {
  if (IsConstructor(C).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  const promiseCapability = new PromiseCapabilityRecord();
  const steps = GetCapabilitiesExecutorFunctions;
  const executor = CreateBuiltinFunction(steps, ['Capability']);
  executor.Capability = promiseCapability;
  const promise = Q(Construct(C, [executor]));
  if (IsCallable(promiseCapability.Resolve).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  if (IsCallable(promiseCapability.Reject).isFalse()) {
    return surroundingAgent.Throw('TypeError');
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
  if (Type(handler) === 'Undefined') {
    if (type === 'Fulfill') {
      handlerResult = new NormalCompletion(argument);
    } else {
      Assert(type === 'Reject');
      handlerResult = new ThrowCompletion(argument);
    }
  } else {
    handlerResult = Call(handler, NewValue(undefined), [argument]);
  }
  let status;
  if (handlerResult instanceof AbruptCompletion) {
    status = Call(promiseCapability.Reject, NewValue(undefined), [handlerResult.Value]);
  } else {
    status = Call(promiseCapability.Resolve, NewValue(undefined), [handlerResult.Value]);
  }
  return status;
}

function PromiseResolveTheableJob(promiseToResolve, thenable, then) {
  const resolvingFunctions = CreateResolvingFunctions(promiseToResolve);
  const thenCallResult = Call(then, thenable, [
    resolvingFunctions.Resolve, resolvingFunctions.Reject,
  ]);
  if (thenCallResult instanceof AbruptCompletion) {
    const status = Call(resolvingFunctions.Reject, NewValue(undefined), [thenCallResult.Value]);
    return status;
  }
  return thenCallResult;
}

function TriggerPromiseReactions(reactions, argument) {
  reactions.forEach((reaction) => {
    EnqueueJob('PromiseJobs', PromiseReactionJob, [reaction, argument]);
  });
  return NewValue(undefined);
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

function PromiseResolveFunctions(realm, [resolution]) {
  const F = this;
  Assert('Promise' in F && Type(F.Promise) === 'Object');
  const promise = F.Promise;
  const alreadyResolved = F.AlreadyResolved;
  if (alreadyResolved.Value === true) {
    return NewValue(undefined);
  }
  alreadyResolved.Value = true;
  if (SameValue(resolution, promise) === true) {
    const selfResolutionError = Construct(surroundingAgent.intrinsic('%TypeError%'), []);
    return RejectPromise(promise, selfResolutionError);
  }
  if (Type(resolution) !== 'Object') {
    return FulfillPromise(promise, resolution);
  }

  const then = Get(resolution, NewValue('then'));
  if (then instanceof AbruptCompletion) {
    return RejectPromise(promise, then.Value);
  }
  const thenAction = then.Value;
  if (IsCallable(thenAction).isFalse()) {
    return FulfillPromise(promise, resolution);
  }
  EnqueueJob('PromiseJobs', PromiseResolveTheableJob, [promise, resolution, thenAction]);
  return NewValue(undefined);
}

function PromiseRejectFunctions(realm, [reason]) {
  const F = this;
  Assert('Promise' in F && Type(F.Promise) === 'Object');
  const promise = F.Promise;
  const alreadyResolved = F.AlreadyResolved;
  if (alreadyResolved.Value === true) {
    return NewValue(undefined);
  }
  alreadyResolved.Value = true;
  return RejectPromise(promise, reason);
}

export function CreateResolvingFunctions(promise) {
  const alreadyResolved = { Value: false };
  const stepsResolve = PromiseResolveFunctions;
  const resolve = CreateBuiltinFunction(stepsResolve, ['Promise', 'AlreadyResolved']);
  SetFunctionLength(resolve, NewValue(1));
  resolve.Promise = promise;
  resolve.AlreadyResolved = alreadyResolved;
  const stepsReject = PromiseRejectFunctions;
  const reject = CreateBuiltinFunction(stepsReject, ['Promise', 'AlreadyResolved']);
  SetFunctionLength(reject, NewValue(1));
  reject.Promise = promise;
  reject.AlreadyResolved = alreadyResolved;
  return {
    Resolve: resolve,
    Reject: reject,
  };
}
