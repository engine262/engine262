// @ts-nocheck
import {
  Call, CreateBuiltinFunction, GetMethod, NewPromiseCapability, PerformPromiseThen, PromiseResolve, surroundingAgent,
} from '../api.mjs';
import {
  Completion, EnsureCompletion, IfAbruptRejectPromise, X,
} from '../completion.mjs';
import { Value, wellKnownSymbols } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-asynciteratorprototype-asynciterator */
function AsyncIteratorPrototype_asyncIterator(args, { thisValue }) {
  // 1. Return the this value.
  return thisValue;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-%asynciteratorprototype%-@@asyncdispose */
function AsyncIteratorPrototype_asyncDispose(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 3. Let return be GetMethod(O, "return").
  const return_ = GetMethod(O, Value('return'));
  // 4. IfAbruptRejectPromise(return, promiseCapability).
  IfAbruptRejectPromise(return_, promiseCapability);
  // 5. If return is undefined, then
  if (return_ === Value.undefined) {
    // a. Perform ! Call(promiseCapability.[[Resolve]], undefined, « undefined »).
    X(Call(promiseCapability.Resolve, Value.undefined, [Value.undefined]));
  } else { // 6. Else,
    // a. Let result be Call(return, O, « undefined »).
    const result = Call(return_, O, [Value.undefined]);
    // b. IfAbruptRejectPromise(result, promiseCapability).
    IfAbruptRejectPromise(result, promiseCapability);
    // c. Let resultWrapper be Completion(PromiseResolve(%Promise%, result)).
    const resultWrapper = EnsureCompletion(PromiseResolve(surroundingAgent.intrinsic('%Promise%'), result));
    // d. IfAbruptRejectPromise(resultWrapper, promiseCapability).
    IfAbruptRejectPromise(resultWrapper, promiseCapability);
    // e. Let unwrap be a new Abstract Closure that performs the following steps when called:
    const unwrap = () => { // eslint-disable-line arrow-body-style
      // i. Return undefined.
      return Value.undefined;
    };
    // f. Let onFulfilled be CreateBuiltinFunction(unwrap, 1, "", « »).
    const onFulfilled = CreateBuiltinFunction(unwrap, 1, Value(''), []);
    // g. Perform PerformPromiseThen(resultWrapper, onFulfilled, undefined, promiseCapability).
    PerformPromiseThen(resultWrapper, onFulfilled, Value.undefined, promiseCapability);
  }
  // 7. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}

export function bootstrapAsyncIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    [wellKnownSymbols.asyncIterator, AsyncIteratorPrototype_asyncIterator, 0],
    [wellKnownSymbols.asyncDispose, AsyncIteratorPrototype_asyncDispose, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%AsyncIteratorPrototype%'] = proto;
}
