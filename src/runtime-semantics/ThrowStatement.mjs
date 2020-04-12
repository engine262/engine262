import {
  Evaluate,
} from '../evaluator.mjs';
import {
  GetValue,
} from '../abstract-ops/all.mjs';
import {
  Q,
  ThrowCompletion,
} from '../completion.mjs';

// #sec-throw-statement-runtime-semantics-evaluation
// ThrowStatement : `throw` Expression `;`
export function* Evaluate_ThrowStatement({ Expression }) {
  // 1. Let exprRef be the result of evaluating Expression.
  const exprRef = yield* Evaluate(Expression);
  // 2. Let exprValue be ? GetValue(exprRef).
  const exprValue = Q(GetValue(exprRef));
  // 3. Return ThrowCompletion(exprValue).
  return new ThrowCompletion(exprValue);
}
