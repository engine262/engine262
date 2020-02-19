import { surroundingAgent } from '../engine.mjs';
import { Q } from '../completion.mjs';
import { Value } from '../value.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  PerformEval,
  SetFunctionLength,
  SetFunctionName,
  // GetThisEnvironment,
} from '../abstract-ops/all.mjs';

// #sec-eval-x
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

export function BootstrapEval(realmRec) {
  const it = CreateBuiltinFunction(Eval, [], realmRec);
  SetFunctionName(it, new Value('eval'));
  SetFunctionLength(it, new Value(1));

  realmRec.Intrinsics['%eval%'] = it;
}
