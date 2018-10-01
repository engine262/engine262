import {
  EnqueueJob,
  HostPromiseRejectionTracker,
  surroundingAgent,
} from '../engine.mjs';
import {
  Value,
  Type,
} from '../value.mjs';
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
} from '../completion.mjs';

export function PromiseResolve(C, x) {
  Assert(Type(C) === 'Object');
  if (IsPromise(x).isTrue()) {
    const xConstructor = Q(Get(x, new Value('constructor')));
    if (SameValue(xConstructor, C)) {
      return x;
    }
  }
  const promiseCapability = Q(NewPromiseCapability(C));
  Q(Call(promiseCapability.Resolve, new Value(undefined), [x]));
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
  return new Value(undefined);
}

export class PromiseCapabilityRecord {
  constructor() {
    this.Promise = new Value(undefined);
    this.Resolve = new Value(undefined);
    this.Reject = new Value(undefined);
  }
}

export function NewPromiseCapability(C) {
  if (IsConstructor(C).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'value is not a constructor');
  }
  const promiseCapability = new PromiseCapabilityRecord();
  const steps = GetCapabilitiesExecutorFunctions;
  const executor = CreateBuiltinFunction(steps, ['Capability']);
  SetFunctionLength(executor, new Value(2));
  executor.Capability = promiseCapability;
  const promise = Q(Construct(C, [executor]));
  if (IsCallable(promiseCapability.Resolve).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'Promise resolve function is not callable');
  }
  if (IsCallable(promiseCapability.Reject).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'Promise reject function is not callable');
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
    handlerResult = Call(handler, new Value(undefined), [argument]);
  }
  let status;
  if (handlerResult instanceof AbruptCompletion) {
    status = Call(promiseCapability.Reject, new Value(undefined), [handlerResult.Value]);
  } else {
    status = Call(promiseCapability.Resolve, new Value(undefined), [handlerResult.Value]);
  }
  return status;
}

function PromiseResolveTheableJob(promiseToResolve, thenable, then) {
  const resolvingFunctions = CreateResolvingFunctions(promiseToResolve);
  const thenCallResult = Call(then, thenable, [
    resolvingFunctions.Resolve, resolvingFunctions.Reject,
  ]);
  if (thenCallResult instanceof AbruptCompletion) {
    const status = Call(resolvingFunctions.Reject, new Value(undefined), [thenCallResult.Value]);
    return status;
  }
  return thenCallResult;
}

function TriggerPromiseReactions(reactions, argument) {
  reactions.forEach((reaction) => {
    EnqueueJob('PromiseJobs', PromiseReactionJob, [reaction, argument]);
  });
  return new Value(undefined);
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
    return new Value(undefined);
  }
  alreadyResolved.Value = true;
  if (SameValue(resolution, promise) === true) {
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
  if (IsCallable(thenAction).isFalse()) {
    return FulfillPromise(promise, resolution);
  }
  EnqueueJob('PromiseJobs', PromiseResolveTheableJob, [promise, resolution, thenAction]);
  return new Value(undefined);
}

function PromiseRejectFunctions([reason]) {
  const F = this;

  Assert('Promise' in F && Type(F.Promise) === 'Object');
  const promise = F.Promise;
  const alreadyResolved = F.AlreadyResolved;
  if (alreadyResolved.Value === true) {
    return new Value(undefined);
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
