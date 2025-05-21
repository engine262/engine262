// This file covers abstract operations defined in
// https://tc39.es/ecma262/#sec-import-calls

import {
  AbstractModuleRecord,
  Assert,
  Call, CreateBuiltinFunction, CreateListIteratorRecord, GatherAsynchronousTransitiveDependencies, GetModuleNamespace, NewPromiseCapability, PerformPromiseThen, PromiseCapabilityRecord, surroundingAgent, Value,
  type Arguments,
  type PromiseObject,
} from '../index.mts';
import {
  AbruptCompletion, ValueOfNormalCompletion, X, type PlainCompletion,
} from '../completion.mts';
import { PerformPromiseAll } from '../intrinsics/Promise.mts';

/** https://tc39.es/ecma262/#sec-ContinueDynamicImport */
export function ContinueDynamicImport(
  promiseCapability: PromiseCapabilityRecord,
  moduleCompletion: PlainCompletion<AbstractModuleRecord>,
  /* [import-defer] */ phase: 'defer' | 'evaluation',
) {
  // 1. If moduleCompletion is an abrupt completion, then
  if (moduleCompletion instanceof AbruptCompletion) {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « moduleCompletion.[[Value]] »).
    X(Call(promiseCapability.Reject, Value.undefined, [moduleCompletion.Value]));
    // b. Return unused.
    return;
  }
  // 2. Let module be moduleCompletion.[[Value]].
  const module = ValueOfNormalCompletion(moduleCompletion);

  // 3. Let loadPromise be module.LoadRequestedModules().
  const loadPromise = module.LoadRequestedModules();

  // 4. Let rejectedClosure be a new Abstract Closure with parameters (reason) that captures promiseCapability and performs the following steps when called:
  const rejectedClosure = ([reason = Value.undefined]: Arguments): void => {
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « reason »).
    X(Call(promiseCapability.Reject, Value.undefined, [reason]));
    // b. Return unused.
  };
  // 5. Let onRejected be CreateBuiltinFunction(rejectedClosure, 1, "", « »).
  const onRejected = CreateBuiltinFunction(rejectedClosure, 1, Value(''), []);

  // 6. Let linkAndEvaluateClosure be a new Abstract Closure with no parameters that captures module, promiseCapability, and onRejected and performs the following steps when called:
  function* linkAndEvaluateClosure() {
    // a. Let link be Completion(module.Link()).
    const link = module.Link();
    // b. If link is an abrupt completion, then
    if (link instanceof AbruptCompletion) {
      // i. Perform ! Call(promiseCapability.[[Reject]], undefined, « link.[[Value]] »).
      X(Call(promiseCapability.Reject, Value.undefined, [link.Value]));
      // ii. Return unused.
      return;
    }

    let evaluatePromise: PromiseObject;
    if (!surroundingAgent.feature('import-defer')) {
      // c. Let evaluatePromise be module.Evaluate().
      evaluatePromise = yield* module.Evaluate();
    }

    // d. Let fulfilledClosure be a new Abstract Closure with no parameters that captures module and promiseCapability and performs the following steps when called:
    const fulfilledClosure = () => {
      // i. Let namespace be GetModuleNamespace(module).
      const namespace = GetModuleNamespace(module, /* [import-defer] */ phase);
      // ii. Perform ! Call(promiseCapability.[[Resolve]], undefined, « namespace »).
      X(Call(promiseCapability.Resolve, Value.undefined, [namespace]));
      // iii. Return unused.
    };

    /** https://tc39.es/proposal-defer-import-eval/#sec-ContinueDynamicImport */
    if (surroundingAgent.feature('import-defer')) {
      // e. If phase is "defer", then
      if (phase === 'defer') {
        // i. Let evaluationList be module.GatherAsynchronousTransitiveDependencies().
        const evaluationList = GatherAsynchronousTransitiveDependencies(module);
        // ii. If evaluationList is empty, then
        if (evaluationList.length === 0) {
          // 1. Perform fulfilledClosure().
          fulfilledClosure();
          // 2. Return unused.
          return;
        }
        // iii. Let asyncDepsEvaluationPromises be a new empty List.
        const asyncDepsEvaluationPromises = [];
        // iv. For each dep in evaluationList, append dep.Evaluate() to asyncDepsEvaluationPromises.
        for (const dep of evaluationList) {
          asyncDepsEvaluationPromises.push(yield* dep.Evaluate());
        }
        // v. Let iterator be CreateListIteratorRecord(asyncDepsEvaluationPromises).
        const iterator = CreateListIteratorRecord(asyncDepsEvaluationPromises);
        // vi. Let pc be ! NewPromiseCapability(%Promise%).
        const pc = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
        // vii. Let evaluatePromise be ! PerformPromiseAll(iterator, %Promise%, pc, %Promise.resolve%).
        evaluatePromise = X(PerformPromiseAll(iterator, surroundingAgent.intrinsic('%Promise%'), pc, surroundingAgent.intrinsic('%Promise.resolve%'))) as PromiseObject;
      } else { // f. Else,
        // i. Assert: phase is EVALUATION.
        Assert(phase === 'evaluation');
        // ii. Let evaluatePromise be module.Evaluate().
        evaluatePromise = yield* module.Evaluate();
      }
    }

    // e. Let onFulfilled be CreateBuiltinFunction(fulfilledClosure, 0, "", « »).
    const onFulfilled = CreateBuiltinFunction(fulfilledClosure, 0, Value(''), []);

    // f. Perform PerformPromiseThen(evaluatePromise, onFulfilled, onRejected).
    PerformPromiseThen(evaluatePromise!, onFulfilled, onRejected);
    // g. Return unused.
  }
  // 7. Let linkAndEvaluate be CreateBuiltinFunction(linkAndEvaluateClosure, 0, "", « »).
  const linkAndEvaluate = CreateBuiltinFunction(linkAndEvaluateClosure, 0, Value(''), []);

  // 8. Perform PerformPromiseThen(loadPromise, linkAndEvaluate, onRejected).
  PerformPromiseThen(loadPromise, linkAndEvaluate, onRejected);
  // 9. Return unused.
}
