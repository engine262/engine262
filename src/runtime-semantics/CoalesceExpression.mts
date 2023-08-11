// @ts-nocheck
import { Q } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';

/** https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation */
//   CoalesceExpression :
//     CoalesceExpressionHead `??` BitwiseORExpression
export function* Evaluate_CoalesceExpression({ CoalesceExpressionHead, BitwiseORExpression }: ParseNode.CoalesceExpression) {
  // 1. Let lref be the result of evaluating |CoalesceExpressionHead|.
  const lref = yield* Evaluate(CoalesceExpressionHead);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(GetValue(lref));
  // 3. If lval is *undefined* or *null*,
  if (lval === Value.undefined || lval === Value.null) {
    // a. Let rref be the result of evaluating |BitwiseORExpression|.
    const rref = yield* Evaluate(BitwiseORExpression);
    // b. Return ? GetValue(rref).
    return Q(GetValue(rref));
  }
  // 4. Otherwise, return lval.
  return lval;
}
