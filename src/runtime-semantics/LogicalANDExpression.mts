// @ts-nocheck
import { Value } from '../value.mts';
import { GetValue, ToBoolean } from '../abstract-ops/all.mts';
import { Evaluate } from '../evaluator.mts';
import { Q, X } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation */
//   LogicalANDExpression :
//     LogicalANDExpression `&&` BitwiseORExpression
export function* Evaluate_LogicalANDExpression({ LogicalANDExpression, BitwiseORExpression }: ParseNode.LogicalANDExpression) {
  // 1. Let lref be the result of evaluating LogicalANDExpression.
  const lref = yield* Evaluate(LogicalANDExpression);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(GetValue(lref));
  // 3. Let lbool be ! ToBoolean(lval).
  const lbool = X(ToBoolean(lval));
  // 4. If lbool is false, return lval.
  if (lbool === Value.false) {
    return lval;
  }
  // 5. Let rref be the result of evaluating BitwiseORExpression.
  const rref = yield* Evaluate(BitwiseORExpression);
  // 6. Return ? GetValue(rref).
  return Q(GetValue(rref));
}
