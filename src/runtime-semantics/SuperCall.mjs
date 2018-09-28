import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Construct,
  GetThisEnvironment,
  GetNewTarget,
  IsConstructor,
} from '../abstract-ops/all.mjs';
import { Type, FunctionValue } from '../value.mjs';
import { ArgumentListEvaluation } from './all.mjs';
import { Q, X, ReturnIfAbrupt } from '../completion.mjs';
import { FunctionEnvironmentRecord } from '../environment.mjs';

// #sec-getsuperconstructor
function GetSuperConstructor() {
  const envRec = GetThisEnvironment();
  Assert(envRec instanceof FunctionEnvironmentRecord);
  const activeFunction = envRec.FunctionObject;
  Assert(activeFunction instanceof FunctionValue);
  const superConstructor = X(activeFunction.GetPrototypeOf());
  if (IsConstructor(superConstructor).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return superConstructor;
}

// #sec-super-keyword-runtime-semantics-evaluation
// SuperCall : `super` Arguments
export function* Evaluate_SuperCall({ arguments: Arguments }) {
  const newTarget = GetNewTarget();
  Assert(Type(newTarget) === 'Object');
  const func = Q(GetSuperConstructor());
  const argList = yield* ArgumentListEvaluation(Arguments);
  ReturnIfAbrupt(argList);
  const result = Q(Construct(func, argList, newTarget));
  const thisER = GetThisEnvironment();
  return Q(thisER.BindThisValue(result));
}
