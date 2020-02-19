import { GetValue } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Await, Q } from '../completion.mjs';

// #sec-async-function-definitions-runtime-semantics-evaluation
//   AwaitExpression : `await` UnaryExpression
export function* Evaluate_AwaitExpression({ UnaryExpression }) {
  // 1. Let exprRef be the result of evaluating UnaryExpression.
  const exprRef = yield* Evaluate(UnaryExpression);
  // 2. Let value be ? GetValue(exprRef).
  const value = Q(GetValue(exprRef));
  // 3. Return ? Await(value).
  return Q(yield* Await(value));
}
