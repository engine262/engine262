import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Call,
  CreateBuiltinFunction,
  Get,
  Invoke,
  IsCallable,
  IsConstructor,
  IsPromise,
  NewPromiseCapability,
  PerformPromiseThen,
  PromiseResolve,
  SetFunctionLength,
  SetFunctionName,
  SpeciesConstructor,
} from '../abstract-ops/all.mjs';
import { Type, Value } from '../value.mjs';
import { Q, ThrowCompletion, X } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

// #sec-promise.prototype.catch
function PromiseProto_catch([onRejected = Value.undefined], { thisValue }) {
  // 1. Let promise be the this value.
  const promise = thisValue;
  // 2. Return ? Invoke(promise, "then", « undefined, onRejected »).
  return Q(Invoke(promise, new Value('then'), [Value.undefined, onRejected]));
}

function ThenFinallyFunctions([value = Value.undefined]) {
  const F = surroundingAgent.activeFunctionObject;
  const onFinally = F.OnFinally;
  Assert(IsCallable(onFinally) === Value.true);
  const result = Q(Call(onFinally, Value.undefined));
  const C = F.Constructor;
  Assert(IsConstructor(C) === Value.true);
  const promise = Q(PromiseResolve(C, result));
  const valueThunk = CreateBuiltinFunction(() => value, []);
  SetFunctionLength(valueThunk, 0);
  SetFunctionName(valueThunk, new Value(''));
  return Q(Invoke(promise, new Value('then'), [valueThunk]));
}

function CatchFinallyFunctions([reason = Value.undefined]) {
  const F = surroundingAgent.activeFunctionObject;
  const onFinally = F.OnFinally;
  Assert(IsCallable(onFinally) === Value.true);
  const result = Q(Call(onFinally, Value.undefined));
  const C = F.Constructor;
  Assert(IsConstructor(C) === Value.true);
  const promise = Q(PromiseResolve(C, result));
  const thrower = CreateBuiltinFunction(() => ThrowCompletion(reason), []);
  SetFunctionLength(thrower, 0);
  SetFunctionName(thrower, new Value(''));
  return Q(Invoke(promise, new Value('then'), [thrower]));
}

// #sec-promise.prototype.finally
function PromiseProto_finally([onFinally = Value.undefined], { thisValue }) {
  // 1. Let promise be the this value.
  const promise = thisValue;
  // 2. If Type(promise) is not Object, throw a TypeError exception.
  if (Type(promise) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Promise', promise);
  }
  // 3. Let C be ? SpeciesConstructor(promise, %Promise%).
  const C = SpeciesConstructor(promise, surroundingAgent.intrinsic('%Promise%'));
  // 4. Assert: IsConstructor(C) is true.
  Assert(IsConstructor(C) === Value.true);
  let thenFinally;
  let catchFinally;
  // 5. If IsCallable(onFinally) is false, then
  if (IsCallable(onFinally) === Value.false) {
    // a. Let thenFinally be onFinally.
    thenFinally = onFinally;
    // b. Let catchFinally be onFinally.
    catchFinally = onFinally;
  } else { // 6. Else,
    // a. Let stepsThenFinally be the algorithm steps defined in Then Finally Functions.
    const stepsThenFinally = ThenFinallyFunctions;
    // b. .Let thenFinally be ! CreateBuiltinFunction(stepsThenFinally, « [[Constructor]], [[OnFinally]] »).
    thenFinally = X(CreateBuiltinFunction(stepsThenFinally, ['Constructor', 'OnFinally']));
    SetFunctionLength(thenFinally, 1);
    SetFunctionName(thenFinally, new Value(''));
    // c. Set thenFinally.[[Constructor]] to C.
    thenFinally.Constructor = C;
    // d. Set thenFinally.[[OnFinally]] to onFinally.
    thenFinally.OnFinally = onFinally;
    // e. Let stepsCatchFinally be the algorithm steps defined in Catch Finally Functions.
    const stepsCatchFinally = CatchFinallyFunctions;
    // f. Let catchFinally be ! CreateBuiltinFunction(stepsCatchFinally, « [[Constructor]], [[OnFinally]] »).
    catchFinally = X(CreateBuiltinFunction(stepsCatchFinally, ['Constructor', 'OnFinally']));
    SetFunctionLength(catchFinally, 1);
    SetFunctionName(catchFinally, new Value(''));
    // g. Set catchFinally.[[Constructor]] to C.
    catchFinally.Constructor = C;
    // h. Set catchFinally.[[OnFinally]] to onFinally.
    catchFinally.OnFinally = onFinally;
  }
  // 7. Return ? Invoke(promise, "then", « thenFinally, catchFinally »).
  return Q(Invoke(promise, new Value('then'), [thenFinally, catchFinally]));
}

// #sec-promise.prototype.then
function PromiseProto_then([onFulfilled = Value.undefined, onRejected = Value.undefined], { thisValue }) {
  // 1. Let promise be the this value.
  const promise = thisValue;
  // 2. If IsPromise(promise) is false, throw a TypeError exception.
  if (IsPromise(promise) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Promise', promise);
  }
  // 3. Let C be ? SpeciesConstructor(promise, %Promise%).
  const C = Q(SpeciesConstructor(promise, surroundingAgent.intrinsic('%Promise%')));
  // 4. Let resultCapability be ? NewPromiseCapability(C).
  const resultCapability = Q(NewPromiseCapability(C));
  // 5. Return PerformPromiseThen(promise, onFulfilled, onRejected, resultCapability).
  return PerformPromiseThen(promise, onFulfilled, onRejected, resultCapability);
}

export function bootstrapPromisePrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['catch', PromiseProto_catch, 1],
    ['finally', PromiseProto_finally, 1],
    ['then', PromiseProto_then, 2],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Promise');

  realmRec.Intrinsics['%Promise.prototype.then%'] = X(Get(proto, new Value('then')));

  realmRec.Intrinsics['%Promise.prototype%'] = proto;
}
