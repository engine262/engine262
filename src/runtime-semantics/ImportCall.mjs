import { surroundingAgent, HostImportModuleDynamically } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import {
  GetValue,
  ToString,
  NewPromiseCapability,
  GetActiveScriptOrModule,
} from '../abstract-ops/all.mjs';
import { Q, X, IfAbruptRejectPromise } from '../completion.mjs';

// #sec-import-calls
// ImportCall : `import` `(` AssignmentExpression `)`
export function* Evaluate_ImportCall({ arguments: [AssignmentExpression] }) {
  const referencingScriptOrModule = X(GetActiveScriptOrModule());
  const argRef = yield* Evaluate(AssignmentExpression);
  const specifier = Q(GetValue(argRef));
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  const specifierString = ToString(specifier);
  IfAbruptRejectPromise(specifierString, promiseCapability);
  X(HostImportModuleDynamically(referencingScriptOrModule, specifierString, promiseCapability));
  return promiseCapability.Promise;
}
