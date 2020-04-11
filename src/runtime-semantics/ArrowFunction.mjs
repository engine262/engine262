import { Value } from '../value.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Q, ReturnCompletion } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { NamedEvaluation_ArrowFunction } from './all.mjs';

// #sec-arrow-function-definitions-runtime-semantics-evaluation
//   ArrowFunction : ArrowParameters `=>` ConciseBody
export function Evaluate_ArrowFunction(ArrowFunction) {
  return NamedEvaluation_ArrowFunction(ArrowFunction, new Value(''));
}

// #sec-arrow-function-definitions-runtime-semantics-evaluation
//   ExpressionBody : AssignmentExpression
export function* Evaluate_ExpressionBody(ExpressionBody) {
  const AssignmentExpression = ExpressionBody;
  // 1. Let exprRef be the result of evaluating |AssignmentExpression|.
  const exprRef = yield* Evaluate(AssignmentExpression);
  // 2. Let exprValue be ? GetValue(exprRef).
  const exprValue = Q(GetValue(exprRef));
  // 3. Return Completion { [[Type]]: return, [[Value]]: exprValue, [[Target]]: empty }.
  return new ReturnCompletion(exprValue);
}
