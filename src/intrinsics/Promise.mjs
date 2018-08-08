/* @flow */

/* ::
import type { Realm } from '../realm.mjs';
import type {
  Value,
  ObjectValue,
} from '../value.mjs';
*/
import {
  surroundingAgent,
  EnqueueJob,
  HostPromiseRejectionTracker,
} from '../engine.mjs';
import {
  Type,
  UndefinedValue,
  New as NewValue,
} from '../value.mjs';
import {
  Assert,
  IsCallable,
  CreateBuiltinFunction,
  Call,
  OrdinaryCreateFromConstructor,
  SameValue,
  Construct,
  Get,
  IsPromise,
  IsConstructor,
} from '../abstract-ops/all.mjs';
import {
  Q,
  Completion,
  NormalCompletion,
  AbruptCompletion,
  ThrowCompletion,
} from '../completion.mjs';

export function PromiseResolve(C /* : ObjectValue */, x /* : ObjectValue */) {
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
    surroundingAgent.Throw('TypeError');
  }
  if (promiseCapability.Reject !== undefined) {
    surroundingAgent.Throw('TypeError');
  }
  promiseCapability.Resolve = resolve;
  promiseCapability.Reject = reject;
  return NewValue(undefined);
}

function NewPromiseCapability(C /* : ObjectValue */) {
  if (IsConstructor(C).isFalse()) {
    surroundingAgent.Throw('TypeError');
  }
  const promiseCapability = {
    Promise: undefined,
    Resolve: undefined,
    Reject: undefined,
  };
  const steps = GetCapabilitiesExecutorFunctions;
  const executor = CreateBuiltinFunction(steps, ['Capability']);
  executor.Capability = promiseCapability;
  const promise = Q(Construct(C, [executor]));
  if (IsCallable(promiseCapability.Resolve).isFalse()) {
    surroundingAgent.Throw('TypeError');
  }
  if (IsCallable(promiseCapability.Reject).isFalse()) {
    surroundingAgent.Throw('TypeError');
  }
  promiseCapability.Promise = promise;
  return promiseCapability;
}

function PromiseReactionJob(reaction, argument) {
  // Assert: reaction is a PromiseReaction Record.
  const promiseCapability = reaction.Capability;
  const type = reaction.Type;
  const handler = reaction.Handler;
  let handlerResult;
  if (handler instanceof UndefinedValue) {
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
  return new Completion(status);
}

function PromiseResolveTheableJob(promiseToResolve, thenable, then) {
  const resolvingFunctions = CreateResolvingFunctions(promiseToResolve);
  const thenCallResult = Call(then, thenable, [
    resolvingFunctions.Resolve, resolvingFunctions.Reject,
  ]);
  if (thenCallResult instanceof AbruptCompletion) {
    const status = Call(resolvingFunctions.Reject, NewValue(undefined), [thenCallResult.Value]);
    return new Completion(status);
  }
  return new Completion(thenCallResult);
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
  /* :: resolution = ((resolution: any): ObjectValue) */
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

function CreateResolvingFunctions(promise /* : ObjectValue */) {
  const alreadyResolved = { Value: false };
  const stepsResolve = PromiseResolveFunctions;
  const resolve = CreateBuiltinFunction(stepsResolve, ['Promise', 'AlreadyResolved']);
  resolve.Promise = promise;
  resolve.AlreadyResolved = alreadyResolved;
  const stepsReject = PromiseRejectFunctions;
  const reject = CreateBuiltinFunction(stepsReject, ['Promise', 'AlreadyResolved']);
  reject.Promise = promise;
  reject.AlreadyResolved = alreadyResolved;
  return {
    Resolve: resolve,
    Reject: reject,
  };
}

function PromiseConstructor(realm, [executor], { NewTarget }) {
  if (NewTarget instanceof UndefinedValue) {
    surroundingAgent.Throw('TypeError');
  }
  if (IsCallable(executor).isFalse()) {
    surroundingAgent.Throw('TypeError');
  }
  const promise = Q(OrdinaryCreateFromConstructor(NewTarget, '%PromisePrototype%', [
    'PromiseState',
    'PromiseResult',
    'PromiseFulfillReactions',
    'PromiseRejectReactions',
    'PromiseIsHandled',
  ]));
  promise.PromiseState = 'pending';
  promise.PromiseFulfillReactions = [];
  promise.PromiseRejectReactions = [];
  promise.PromiseIsHandled = false;
  const resolvingFunctions = CreateResolvingFunctions(promise);
  const completion = Call(executor, NewValue(undefined), [
    resolvingFunctions.Resolve, resolvingFunctions.Reject,
  ]);
  if (completion instanceof AbruptCompletion) {
    Q(Call(resolvingFunctions.Reject, NewValue(undefined), [completion.Value]));
  }
  return promise;
}

export function CreatePromise(realmRec /* : Realm */) {
  const promiseConstructor = CreateBuiltinFunction(PromiseConstructor, [], realmRec);

  const proto = realmRec.Intrinsics['%PromisePrototype%'];

  promiseConstructor.DefineOwnProperty(NewValue('prototype'), {
    Value: proto,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });
  proto.DefineOwnProperty(NewValue('constructor'), {
    Value: promiseConstructor,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  realmRec.Intrinsics['%Promise%'] = promiseConstructor;
}
