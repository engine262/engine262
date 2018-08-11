import { surroundingAgent } from '../engine';
import {
  CreateBuiltinFunction,
  Invoke,
  SpeciesConstructor,
  Assert,
  IsConstructor,
  IsCallable,
  Call,
  Get,
} from '../abstract-ops/all';
import {
  Type,
  ObjectValue,
  New as NewValue,
} from '../value';
import { Q, ThrowCompletion } from '../completion';
import { PromiseResolve } from './Promise';

function PromiseCatch(realm, [onRejected], { thisValue }) {
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

function PromiseFinally(realm, [onFinally], { thisValue }) {
  const promise = thisValue;
  if (Type(promise) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const C = SpeciesConstructor(promise, '%Promise%');
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

function PromiseThen(realm, [onFulfilled, onRejected], { thisValue }) {
  const promise = thisValue;
  if (IsPromise(promise).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  const C = Q(SpeciesConstructor(promise, '%Promise%'));
  const resultCapability = Q(NewPromiseCapability(C));
  return PerformPromiseThen(promise, onFulfilled, onRejected, resultCapability);
}

export function CreatePromisePrototype(realmRec) {
  const proto = new ObjectValue(realmRec);

  [
    ['catch', PromiseCatch],
    ['finally', PromiseFinally],
    ['then', PromiseThen],
  ].forEach(([name, fn]) => {
    proto.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(fn, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%PromiseProto_then%'] = Get(proto, NewValue('then'));

  realmRec.Intrinsics['%PromisePrototype%'] = proto;
}
