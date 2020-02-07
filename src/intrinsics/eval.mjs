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

function TheEval([x = Value.undefined]) {
  Assert(surroundingAgent.executionContextStack.length >= 2);
  const callerContext = surroundingAgent.executionContextStack[surroundingAgent.executionContextStack.length - 2];
  const callerRealm = callerContext.Realm;
  return Q(PerformEval(x, callerRealm, false, false));
}

export function BootstrapEval(realmRec) {
  const it = CreateBuiltinFunction(TheEval, [], realmRec);
  SetFunctionName(it, new Value('eval'));
  SetFunctionLength(it, new Value(1));

  realmRec.Intrinsics['%eval%'] = it;
}
