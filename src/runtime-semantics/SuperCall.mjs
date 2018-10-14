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
import { Q, ReturnIfAbrupt, X } from '../completion.mjs';
import { FunctionEnvironmentRecord } from '../environment.mjs';

// #sec-getsuperconstructor
function GetSuperConstructor() {
  const envRec = GetThisEnvironment();
  Assert(envRec instanceof FunctionEnvironmentRecord);
  const activeFunction = envRec.FunctionObject;
  Assert(activeFunction instanceof FunctionValue);
  const superConstructor = X(activeFunction.GetPrototypeOf());
  if (IsConstructor(superConstructor) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'Class constructor is not a constructor');
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
