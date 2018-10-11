import { GetValue } from '../abstract-ops/all.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { Q, Await } from '../completion.mjs';

// #prod-AwaitExpression
// AwaitExpression : `await` UnaryExpression
export function* Evaluate_AwaitExpression({ argument: UnaryExpression }) {
  const exprRef = yield* Evaluate_Expression(UnaryExpression);
  const value = Q(GetValue(exprRef));
  return Q(yield* Await(value));
}
