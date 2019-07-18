import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Construct,
  GetNewTarget,
  GetThisEnvironment,
  IsConstructor,
} from '../abstract-ops/all.mjs';
import { FunctionValue, Type, Value } from '../value.mjs';
import { ArgumentListEvaluation } from './all.mjs';
import { Q, X } from '../completion.mjs';
import { FunctionEnvironmentRecord } from '../environment.mjs';
import { msg } from '../helpers.mjs';

// 12.3.5.2 #sec-getsuperconstructor
function GetSuperConstructor() {
  const envRec = GetThisEnvironment();
  Assert(envRec instanceof FunctionEnvironmentRecord);
  const activeFunction = envRec.FunctionObject;
  Assert(activeFunction instanceof FunctionValue);
  const superConstructor = X(activeFunction.GetPrototypeOf());
  if (IsConstructor(superConstructor) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('NotAConstructor', superConstructor));
  }
  return superConstructor;
}

// 12.3.5.1 #sec-super-keyword-runtime-semantics-evaluation
// SuperCall : `super` Arguments
export function* Evaluate_SuperCall({ arguments: Arguments }) {
  const newTarget = GetNewTarget();
  Assert(Type(newTarget) === 'Object');
  const func = Q(GetSuperConstructor());
  const argList = Q(yield* ArgumentListEvaluation(Arguments));
  const result = Q(Construct(func, argList, newTarget));
  const thisER = GetThisEnvironment();
  return Q(thisER.BindThisValue(result));
}
