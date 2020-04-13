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

// #sec-super-keyword-runtime-semantics-evaluation
// SuperCall : `super` Arguments
export function* Evaluate_SuperCall({ Arguments }) {
  // 1. Let newTarget be GetNewTarget().
  const newTarget = GetNewTarget();
  // 2. Assert: Type(newTarget) is Object.
  Assert(Type(newTarget) === 'Object');
  // 3. Let func be ! GetSuperConstructor().
  const func = X(GetSuperConstructor());
  // 4. Let argList be ? ArgumentListEvaluation of Arguments.
  const argList = Q(yield* ArgumentListEvaluation(Arguments));
  // 5. If IsConstructor(func) is false, throw a TypeError exception.
  if (IsConstructor(func) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', func);
  }
  // 6. Let result be ? Construct(func, argList, newTarget).
  const result = Q(Construct(func, argList, newTarget));
  // 7. Let thisER be GetThisEnvironment().
  const thisER = GetThisEnvironment();
  // 8. Return ? thisER.BindThisValue(result).
  return Q(thisER.BindThisValue(result));
}

// #sec-getsuperconstructor
function GetSuperConstructor() {
  // 1. Let envRec be GetThisEnvironment().
  const envRec = GetThisEnvironment();
  // 2. Assert: envRec is a function Environment Record.
  Assert(envRec instanceof FunctionEnvironmentRecord);
  // 3. Let activeFunction be envRec.[[FunctionObject]].
  const activeFunction = envRec.FunctionObject;
  // 4. Assert: activeFunction is an ECMAScript function object.
  Assert(isECMAScriptFunctionObject(activeFunction));
  // 5. Let superConstructor be ! activeFunction.[[GetPrototypeOf]]().
  const superConstructor = X(activeFunction.GetPrototypeOf());
  // 6. Return superConstructor.
  return superConstructor;
}
