import { GetValue } from '../abstract-ops/all.mts';
import { Evaluate, type ExpressionEvaluator } from '../evaluator.mts';
import { Q } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-expression-statement-runtime-semantics-evaluation */
//   ExpressionStatement :
//     Expression `;`
export function* Evaluate_ExpressionStatement({ Expression }: ParseNode.ExpressionStatement): ExpressionEvaluator {
  // 1. Let exprRef be the result of evaluating Expression.
  const exprRef = yield* Evaluate(Expression);
  // 2. Return ? GetValue(exprRef).
  return Q(GetValue(exprRef));
}
