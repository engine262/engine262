import { surroundingAgent, HostLoadImportedModule } from '../host-defined/engine.mts';
import { Evaluate, type ValueEvaluator } from '../evaluator.mts';
import {
  GetValue,
  ToString,
  NewPromiseCapability,
  GetActiveScriptOrModule,
} from '../abstract-ops/all.mts';
import {
  Q, X, IfAbruptRejectPromise,
} from '../completion.mts';
import {
  AbstractModuleRecord, CyclicModuleRecord, JSStringValue, NullValue, Realm, type PromiseObject, type ScriptRecord,
} from '../index.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { __ts_cast__ } from '../helpers.mts';

/** https://tc39.es/ecma262/#sec-import-calls */
// ImportCall : `import` `(` AssignmentExpression `)`
export function* Evaluate_ImportCall({ AssignmentExpression }: ParseNode.ImportCall): ValueEvaluator<PromiseObject> {
  Q(surroundingAgent.debugger_cannotPreview);
  // 1. Let referrer be ! GetActiveScriptOrModule().
  let referrer: NullValue | AbstractModuleRecord | ScriptRecord | Realm = X(GetActiveScriptOrModule());
  // 2. If referrer is null, set referrer to the current Realm Record.
  if (referrer instanceof NullValue) {
    referrer = surroundingAgent.currentRealmRecord;
  }
  // 3. Let argRef be the result of evaluating AssignmentExpression.
  const argRef = yield* Evaluate(AssignmentExpression);
  // 4. Let specifier be ? GetValue(argRef).
  const specifier = Q(yield* GetValue(argRef));
  // 5. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 6. Let specifierString be ToString(specifier).
  const specifierString = yield* ToString(specifier);
  // 7. IfAbruptRejectPromise(specifierString, promiseCapability).
  IfAbruptRejectPromise(specifierString, promiseCapability);
  __ts_cast__<JSStringValue>(specifierString);
  // 8. Perform HostLoadImportedModule(referrer, specifierString, ~empty~, promiseCapability).
  HostLoadImportedModule(referrer as CyclicModuleRecord | ScriptRecord | Realm, specifierString, undefined, promiseCapability);
  // 9. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}
