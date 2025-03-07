// @ts-nocheck
// This file covers abstract operations defined in
// https://tc39.es/ecma262/#sec-import-calls

import {
  Call, CreateBuiltinFunction, GetModuleNamespace, PerformPromiseThen, Value,
} from '../api.mts';
import { AbruptCompletion, X } from '../completion.mts';

/** https://tc39.es/ecma262/#sec-ContinueDynamicImport */
export function ContinueDynamicImport(promiseCapability, moduleCompletion) {
  // 1. If moduleCompletion is an abrupt completion, then
  if (moduleCompletion instanceof AbruptCompletion) {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « moduleCompletion.[[Value]] »).
    X(Call(promiseCapability.Reject, undefined, [moduleCompletion.Value]));
    // b. Return unused.
    return;
  }
  // 2. Let module be moduleCompletion.[[Value]].
  const module = moduleCompletion.Value;

  // 3. Let loadPromise be module.LoadRequestedModules().
  const loadPromise = module.LoadRequestedModules();

  // 4. Let rejectedClosure be a new Abstract Closure with parameters (reason) that captures promiseCapability and performs the following steps when called:
  const rejectedClosure = ([reason = Value.undefined]) => {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « reason »).
    X(Call(promiseCapability.Reject, Value.undefined, [reason]));
    // b. Return unused.
  };
  // 5. Let onRejected be CreateBuiltinFunction(rejectedClosure, 1, "", « »).
  const onRejected = CreateBuiltinFunction(rejectedClosure, 1, Value(''), []);

  // 6. Let linkAndEvaluateClosure be a new Abstract Closure with no parameters that captures module, promiseCapability, and onRejected and performs the following steps when called:
  const linkAndEvaluateClosure = () => {
    // a. Let link be Completion(module.Link()).
    const link = module.Link();
    // b. If link is an abrupt completion, then
    if (link instanceof AbruptCompletion) {
      // i. Perform ! Call(promiseCapability.[[Reject]], undefined, « link.[[Value]] »).
      X(Call(promiseCapability.Reject, Value.undefined, [link.Value]));
      // ii. Return unused.
      return;
    }

    // c. Let evaluatePromise be module.Evaluate().
    const evaluatePromise = module.Evaluate();

    // d. Let fulfilledClosure be a new Abstract Closure with no parameters that captures module and promiseCapability and performs the following steps when called:
    const fulfilledClosure = () => {
      // i. Let namespace be GetModuleNamespace(module).
      const namespace = GetModuleNamespace(module);
      // ii. Perform ! Call(promiseCapability.[[Resolve]], undefined, « namespace »).
      X(Call(promiseCapability.Resolve, Value.undefined, [namespace]));
      // iii. Return unused.
    };
    // e. Let onFulfilled be CreateBuiltinFunction(fulfilledClosure, 0, "", « »).
    const onFulfilled = CreateBuiltinFunction(fulfilledClosure, 0, Value(''), []);

    // f. Perform PerformPromiseThen(evaluatePromise, onFulfilled, onRejected).
    PerformPromiseThen(evaluatePromise, onFulfilled, onRejected);
    // g. Return unused.
  };
  // 7. Let linkAndEvaluate be CreateBuiltinFunction(linkAndEvaluateClosure, 0, "", « »).
  const linkAndEvaluate = CreateBuiltinFunction(linkAndEvaluateClosure, 0, Value(''), []);

  // 8. Perform PerformPromiseThen(loadPromise, linkAndEvaluate, onRejected).
  PerformPromiseThen(loadPromise, linkAndEvaluate, onRejected);
  // 9. Return unused.
}
