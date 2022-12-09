// @ts-nocheck
import { surroundingAgent, HostImportModuleDynamically } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import {
  GetValue,
  ToString,
  NewPromiseCapability,
  GetActiveScriptOrModule,
} from '../abstract-ops/all.mjs';
import { Q, X, IfAbruptRejectPromise } from '../completion.mjs';

/** http://tc39.es/ecma262/#sec-import-calls */
// ImportCall : `import` `(` AssignmentExpression `)`
export function* Evaluate_ImportCall({ AssignmentExpression }) {
  // 1. Let referencingScriptOrModule be ! GetActiveScriptOrModule().
  const referencingScriptOrModule = X(GetActiveScriptOrModule());
  // 2. Let argRef be the result of evaluating AssignmentExpression.
  const argRef = yield* Evaluate(AssignmentExpression);
  // 3. Let specifier be ? GetValue(argRef).
  const specifier = Q(GetValue(argRef));
  // 4. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 5. Let specifierString be ToString(specifier).
  const specifierString = ToString(specifier);
  // 6. IfAbruptRejectPromise(specifierString, promiseCapability).
  IfAbruptRejectPromise(specifierString, promiseCapability);
  // 7. Perform ! HostImportModuleDynamically(referencingScriptOrModule, specifierString, promiseCapability).
  X(HostImportModuleDynamically(referencingScriptOrModule, specifierString, promiseCapability));
  // 8. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}
