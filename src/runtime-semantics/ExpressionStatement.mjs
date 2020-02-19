import { GetValue } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';

// #sec-expression-statement-runtime-semantics-evaluation
//   ExpressionStatement :
//     Expression `;`
export function* Evaluate_ExpressionStatement({ Expression }) {
  // 1. Let exprRef be the result of evaluating Expression.
  const exprRef = yield* Evaluate(Expression);
  // 2. Return ? GetValue(exprRef).
  return Q(GetValue(exprRef));
}
