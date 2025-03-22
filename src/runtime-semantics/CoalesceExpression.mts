import { Q } from '../completion.mts';
import { Evaluate, type ExpressionEvaluator } from '../evaluator.mts';
import { GetValue } from '../abstract-ops/all.mts';
import { Value } from '../value.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation */
//   CoalesceExpression :
//     CoalesceExpressionHead `??` BitwiseORExpression
export function* Evaluate_CoalesceExpression({ CoalesceExpressionHead, BitwiseORExpression }: ParseNode.CoalesceExpression): ExpressionEvaluator {
  // 1. Let lref be the result of evaluating |CoalesceExpressionHead|.
  const lref = yield* Evaluate(CoalesceExpressionHead);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(yield* GetValue(lref));
  // 3. If lval is *undefined* or *null*,
  if (lval === Value.undefined || lval === Value.null) {
    // a. Let rref be the result of evaluating |BitwiseORExpression|.
    const rref = yield* Evaluate(BitwiseORExpression);
    // b. Return ? GetValue(rref).
    return Q(yield* GetValue(rref));
  }
  // 4. Otherwise, return lval.
  return lval;
}
