// @ts-nocheck
import { surroundingAgent } from '../engine.mts';
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
  SpeciesConstructor,
} from '../abstract-ops/all.mts';
import { ObjectValue, Value } from '../value.mts';
import { Q, ThrowCompletion, X } from '../completion.mts';
import { bootstrapPrototype } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-promise.prototype.catch */
function PromiseProto_catch([onRejected = Value.undefined], { thisValue }) {
  // 1. Let promise be the this value.
  const promise = thisValue;
  // 2. Return ? Invoke(promise, "then", « undefined, onRejected »).
  return Q(Invoke(promise, Value('then'), [Value.undefined, onRejected]));
}

/** https://tc39.es/ecma262/#sec-promise.prototype.finally */
function PromiseProto_finally([onFinally = Value.undefined], { thisValue }) {
  // 1. Let promise be the this value.
  const promise = thisValue;
  // 2. If Type(promise) is not Object, throw a TypeError exception.
  if (!(promise instanceof ObjectValue)) {
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
    // a. Let thenFinallyClosure be a new Abstract Closure with parameters (value) that captures onFinally and C and performs the following steps when called:
    const thenFinallyClosure = ([value = Value.undefined]) => {
      // i. Let result be ? Call(onFinally, undefined).
      const result = Q(Call(onFinally, Value.undefined));
      // ii. Let promise be ? PromiseResolve(C, result).
      const promiseInner = Q(PromiseResolve(C, result));
      // iii. Let returnValue be a new Abstract Closure with no parameters that captures value and performs the following steps when called:
      //   1. Return value.
      const returnValue = () => value;
      // iv. Let valueThunk be ! CreateBuiltinFunction(returnValue, 0, "", « »).
      const valueThunk = X(CreateBuiltinFunction(returnValue, 0, Value(''), []));
      // v. Return ? Invoke(promise, "then", « valueThunk »).
      return Q(Invoke(promiseInner, Value('then'), [valueThunk]));
    };
    // b. Let thenFinally be ! CreateBuiltinFunction(thenFinallyClosure, 1, "", « »).
    thenFinally = X(CreateBuiltinFunction(thenFinallyClosure, 1, Value(''), []));
    // c. Let catchFinallyClosure be a new Abstract Closure with parameters (reason) that captures onFinally and C and performs the following steps when called:
    const catchFinallyClosure = ([reason = Value.undefined]) => {
      // i. Let result be ? Call(onFinally, undefined).
      const result = Q(Call(onFinally, Value.undefined));
      // ii. Let promise be ? PromiseResolve(C, result).
      const promiseInner = Q(PromiseResolve(C, result));
      // iii. Let throwReason be a new Abstract Closure with no parameters that captures reason and performs the following steps when called:
      //   1. Return ThrowCompletion(reason).
      const throwReason = () => ThrowCompletion(reason);
      // iv. Let thrower be ! CreateBuiltinFunction(throwReason, 0, "", « »).
      const thrower = X(CreateBuiltinFunction(throwReason, 0, Value(''), []));
      // v. Return ? Invoke(promise, "then", « thrower »).
      return Q(Invoke(promiseInner, Value('then'), [thrower]));
    };
    // d. Let catchFinally be ! CreateBuiltinFunction(catchFinallyClosure, 1, "", « »).
    catchFinally = X(CreateBuiltinFunction(catchFinallyClosure, 1, Value(''), []));
  }
  // 7. Return ? Invoke(promise, "then", « thenFinally, catchFinally »).
  return Q(Invoke(promise, Value('then'), [thenFinally, catchFinally]));
}

/** https://tc39.es/ecma262/#sec-promise.prototype.then */
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

  realmRec.Intrinsics['%Promise.prototype.then%'] = X(Get(proto, Value('then')));

  realmRec.Intrinsics['%Promise.prototype%'] = proto;
}
