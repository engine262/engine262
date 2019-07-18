import { surroundingAgent } from '../engine.mjs';
import { isActualNewExpression } from '../ast.mjs';
import {
  Assert,
  Construct,
  GetValue,
  IsConstructor,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { ArgumentListEvaluation } from './all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { msg } from '../helpers.mjs';

// 12.3.3.1.1 #sec-evaluatenew
function* EvaluateNew(constructExpr, args = []) {
  Assert(isActualNewExpression(constructExpr));
  Assert(Array.isArray(args));
  const ref = yield* Evaluate(constructExpr.callee);
  const constructor = Q(GetValue(ref));
  // We convert empty to [] as part of the default parameter.
  const argList = Q(yield* ArgumentListEvaluation(args));
  if (IsConstructor(constructor) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('NotAConstructor', constructor));
  }
  return Q(Construct(constructor, argList));
}

// 12.3.3.1 #sec-new-operator-runtime-semantics-evaluation
//   NewExpression :
//     `new` NewExpression
//     `new` MemberExpression Arguments
export function* Evaluate_NewExpression(NewExpression) {
  return yield* EvaluateNew(NewExpression, NewExpression.arguments);
}
