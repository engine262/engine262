// @ts-nocheck
import { surroundingAgent } from '../engine.mts';
import { Q } from '../completion.mts';
import { Value } from '../value.mts';
import {
  Assert,
  CreateBuiltinFunction,
  PerformEval,
} from '../abstract-ops/all.mts';

/** https://tc39.es/ecma262/#sec-eval-x */
function Eval([x = Value.undefined]) {
  // 1. Assert: The execution context stack has at least two elements.
  Assert(surroundingAgent.executionContextStack.length >= 2);
  // 2. Let callerContext be the second to top element of the execution context stack.
  const callerContext = surroundingAgent.executionContextStack[surroundingAgent.executionContextStack.length - 2];
  // 3. Let callerRealm be callerContext's Realm.
  const callerRealm = callerContext.Realm;
  // 4. Return ? PerformEval(x, callerRealm, false, false).
  return Q(PerformEval(x, callerRealm, false, false));
}

export function bootstrapEval(realmRec) {
  realmRec.Intrinsics['%eval%'] = CreateBuiltinFunction(Eval, 1, Value('eval'), [], realmRec);
}
