import {
  surroundingAgent,
} from '../engine.mjs';
import {
  isActualNewExpression,
} from '../ast.mjs';
import {
  Assert,
  Construct,
  GetValue,
  IsConstructor,
} from '../abstract-ops/all.mjs';
import {
  ArgumentListEvaluation,
} from './all.mjs';
import {
  Evaluate_Expression,
} from '../evaluator.mjs';
import {
  Q,
  ReturnIfAbrupt,
} from '../completion.mjs';

// #sec-evaluatenew
function EvaluateNew(constructExpr, args = []) {
  Assert(isActualNewExpression(constructExpr));
  Assert(Array.isArray(args));
  const ref = Q(Evaluate_Expression(constructExpr.callee));
  const constructor = Q(GetValue(ref));
  // We convert empty to [] as part of the default parameter.
  let argList = ArgumentListEvaluation(args);
  ReturnIfAbrupt(argList);
  if (IsConstructor(constructor).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'value is not a constructor');
  }
  return Q(Construct(constructor, argList));
}

// #sec-new-operator-runtime-semantics-evaluation
//   NewExpression :
//     `new` NewExpression
//     `new` MemberExpression Arguments
export function Evaluate_NewExpression(NewExpression) {
  return EvaluateNew(NewExpression, NewExpression.arguments);
}
