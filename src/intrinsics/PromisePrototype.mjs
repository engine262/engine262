import {
  surroundingAgent,
  EnqueueJob,
  HostPromiseRejectionTracker,
} from '../engine.mjs';
import {
  CreateBuiltinFunction,
  Invoke,
  SpeciesConstructor,
  Assert,
  IsConstructor,
  IsCallable,
  Call,
  Get,
  IsPromise,
  PromiseResolve,
  NewPromiseCapability,
  PromiseReactionJob,
  SetFunctionName,
  SetFunctionLength,
  PromiseCapabilityRecord,
} from '../abstract-ops/all.mjs';
import {
  Type,
  ObjectValue,
  New as NewValue,
} from '../value.mjs';
import { Q, X, ThrowCompletion } from '../completion.mjs';

function PromiseProto_catch(realm, [onRejected], { thisValue }) {
  const promise = thisValue;
  return Q(Invoke(promise, NewValue('then'), [NewValue(undefined), onRejected]));
}

function ThenFinallyFunctions(realm, [value]) {
  const F = this;

  const onFinally = F.OnFinally;
  Assert(IsCallable(onFinally).isTrue());
  const result = Q(Call(onFinally, NewValue(undefined)));
  const C = F.Constructor;
  Assert(IsConstructor(C).isTrue());
  const promise = Q(PromiseResolve(C, result));
  const valueThunk = CreateBuiltinFunction(() => value, []);
  return Q(Invoke(promise, NewValue('then'), [valueThunk]));
}

function CatchFinallyFunctions(realm, [reason]) {
  const F = this;

  const onFinally = F.OnFinally;
  Assert(IsCallable(onFinally).isTrue());
  const result = Q(Call(onFinally, NewValue(undefined)));
  const C = F.Constructor;
  Assert(IsConstructor(C).isTrue());
  const promise = Q(PromiseResolve(C, result));
  const thrower = CreateBuiltinFunction(() => new ThrowCompletion(reason), []);
  return Q(Invoke(promise, NewValue('then'), [thrower]));
}

function PromiseProto_finally(realm, [onFinally], { thisValue }) {
  const promise = thisValue;
  if (Type(promise) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const C = SpeciesConstructor(promise, surroundingAgent.intrinsic('%Promise%'));
  Assert(IsConstructor(C).isTrue());
  let thenFinally;
  let catchFinally;
  if (IsCallable(onFinally).isFalse()) {
    thenFinally = onFinally;
    catchFinally = onFinally;
  } else {
    const stepsThenFinally = ThenFinallyFunctions;
    thenFinally = CreateBuiltinFunction(stepsThenFinally, ['Constructor', 'OnFinally']);
    thenFinally.Constructor = C;
    thenFinally.OnFinally = onFinally;
    const stepsCatchFinally = CatchFinallyFunctions;
    catchFinally = CreateBuiltinFunction(stepsCatchFinally, ['Constructor', 'OnFinally']);
    catchFinally.Constructor = C;
    catchFinally.OnFinally = onFinally;
  }
  return Q(Invoke(promise, NewValue('then'), [thenFinally, catchFinally]));
}

function PerformPromiseThen(promise, onFulfilled, onRejected, resultCapability) {
  Assert(IsPromise(promise).isTrue());
  if (resultCapability) {
    Assert(resultCapability instanceof PromiseCapabilityRecord);
  } else {
    resultCapability = NewValue(undefined);
  }
  if (IsCallable(onFulfilled).isFalse()) {
    onFulfilled = NewValue(undefined);
  }
  if (IsCallable(onRejected).isFalse()) {
    onRejected = NewValue(undefined);
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
  return resultCapability.Promise;
}

function PromiseProto_then(realm, [onFulfilled, onRejected], { thisValue }) {
  const promise = thisValue;
  if (IsPromise(promise).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  const C = Q(SpeciesConstructor(promise, surroundingAgent.intrinsic('%Promise%')));
  const resultCapability = Q(NewPromiseCapability(C));
  return PerformPromiseThen(promise, onFulfilled, onRejected, resultCapability);
}

export function CreatePromisePrototype(realmRec) {
  const proto = new ObjectValue(undefined, realmRec);

  [
    ['catch', PromiseProto_catch, 1],
    ['finally', PromiseProto_finally, 1],
    ['then', PromiseProto_then, 2],
  ].forEach(([name, fn, len]) => {
    fn = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(fn, NewValue(name));
    SetFunctionLength(fn, NewValue(len));
    proto.DefineOwnProperty(NewValue(name), {
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%PromiseProto_then%'] = X(Get(proto, NewValue('then')));

  realmRec.Intrinsics['%PromisePrototype%'] = proto;
}
