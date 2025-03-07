// @ts-nocheck
import { GetValue } from '../abstract-ops/all.mts';
import { Evaluate } from '../evaluator.mts';
import { Await, Q } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-async-function-definitions-runtime-semantics-evaluation */
//   AwaitExpression : `await` UnaryExpression
export function* Evaluate_AwaitExpression({ UnaryExpression }: ParseNode.AwaitExpression) {
  // 1. Let exprRef be the result of evaluating UnaryExpression.
  const exprRef = yield* Evaluate(UnaryExpression);
  // 2. Let value be ? GetValue(exprRef).
  const value = Q(GetValue(exprRef));
  // 3. Return ? Await(value).
  return Q(yield* Await(value));
}
