import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Construct,
  GetNewTarget,
  GetThisEnvironment,
  IsConstructor,
  isECMAScriptFunctionObject,
} from '../abstract-ops/all.mjs';
import { Type, Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { FunctionEnvironmentRecord } from '../environment.mjs';
import { ArgumentListEvaluation } from './all.mjs';


// 12.3.5.2 #sec-getsuperconstructor
function GetSuperConstructor() {
  const envRec = GetThisEnvironment();
  Assert(envRec instanceof FunctionEnvironmentRecord);
  const activeFunction = envRec.FunctionObject;
  Assert(isECMAScriptFunctionObject(activeFunction));
  const superConstructor = X(activeFunction.GetPrototypeOf());
  return superConstructor;
}

// 12.3.5.1 #sec-super-keyword-runtime-semantics-evaluation
// SuperCall : `super` Arguments
export function* Evaluate_SuperCall({ arguments: Arguments }) {
  const newTarget = GetNewTarget();
  Assert(Type(newTarget) === 'Object');
  const func = X(GetSuperConstructor());
  const argList = Q(yield* ArgumentListEvaluation(Arguments));
  if (IsConstructor(func) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', func);
  }
  const result = Q(Construct(func, argList, newTarget));
  const thisER = GetThisEnvironment();
  return Q(thisER.BindThisValue(result));
}
