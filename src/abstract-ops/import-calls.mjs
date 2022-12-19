// This file covers abstract operations defined in
// http://tc39.es/ecma262/#sec-import-calls

import {
  Call, GetModuleNamespace, PerformPromiseThen, Value,
} from '../api.mjs';
import { AbruptCompletion, X } from '../completion.mjs';

/** https://tc39.es/ecma262/#sec-ContinueDynamicImport */
export function ContinueDynamicImport(promiseCapability, module) {
  if (module instanceof AbruptCompletion) {
    X(Call(promiseCapability.Reject, undefined, [module.Value]));
    return;
  }
  module = module.Value;

  const rejectedClosure = ([reason = Value.undefined]) => {
    X(Call(promiseCapability.Reject, Value.undefined, [reason]));
  };
  const onRejected = new Value(rejectedClosure);

  const linkAndEvaluateClosure = () => {
    const link = module.Link();
    if (link instanceof AbruptCompletion) {
      X(Call(promiseCapability.Reject, Value.undefined, [module.Value]));
      return;
    }

    const evaluatePromise = module.Evaluate();

    const fulfilledClosure = () => {
      const namespace = GetModuleNamespace(module);
      if (namespace instanceof AbruptCompletion) {
        X(Call(promiseCapability.Reject, Value.undefined, [namespace.Value]));
      } else {
        X(Call(promiseCapability.Resolve, Value.undefined, [namespace]));
      }
    };
    const onFulfilled = new Value(fulfilledClosure);

    PerformPromiseThen(evaluatePromise, onFulfilled, onRejected);
  };
  const linkAndEvaluate = new Value(linkAndEvaluateClosure);

  const loadPromise = module.LoadRequestedModules();
  PerformPromiseThen(loadPromise, linkAndEvaluate, onRejected);
}
