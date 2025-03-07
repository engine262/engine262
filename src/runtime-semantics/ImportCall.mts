// @ts-nocheck
import { surroundingAgent, HostLoadImportedModule } from '../engine.mts';
import { Evaluate } from '../evaluator.mts';
import {
  GetValue,
  ToString,
  NewPromiseCapability,
  GetActiveScriptOrModule,
} from '../abstract-ops/all.mts';
import {
  Q, X, IfAbruptRejectPromise,
} from '../completion.mts';
import { Value } from '../api.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-import-calls */
// ImportCall : `import` `(` AssignmentExpression `)`
export function* Evaluate_ImportCall({ AssignmentExpression }: ParseNode.ImportCall) {
  // 1. Let referrer be ! GetActiveScriptOrModule().
  let referrer = X(GetActiveScriptOrModule());
  // 2. If referrer is null, set referrer to the current Realm Record.
  if (referrer === null) {
    referrer = surroundingAgent.realm;
  }
  // 3. Let argRef be the result of evaluating AssignmentExpression.
  const argRef = yield* Evaluate(AssignmentExpression);
  // 4. Let specifier be ? GetValue(argRef).
  const specifier = Q(GetValue(argRef));
  // 5. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 6. Let specifierString be ToString(specifier).
  const specifierString = ToString(specifier);
  // 7. IfAbruptRejectPromise(specifierString, promiseCapability).
  IfAbruptRejectPromise(specifierString, promiseCapability);
  // 8. Perform HostLoadImportedModule(referrer, specifierString, ~empty~, promiseCapability).
  HostLoadImportedModule(referrer, specifierString, Value.undefined, promiseCapability);
  // 9. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}
