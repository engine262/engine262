import { Value } from '../value.mts';
import { GetValue, ToBoolean } from '../abstract-ops/all.mts';
import { Evaluate, type ValueEvaluator } from '../evaluator.mts';
import { Q, X } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation */
//   LogicalORExpression :
//     LogicalORExpression `||` LogicalANDExpression
export function* Evaluate_LogicalORExpression({ LogicalORExpression, LogicalANDExpression }: ParseNode.LogicalORExpression): ValueEvaluator {
  // 1. Let lref be the result of evaluating LogicalORExpression.
  const lref = yield* Evaluate(LogicalORExpression);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(yield* GetValue(lref));
  // 3. Let lbool be ! ToBoolean(lval).
  const lbool = X(ToBoolean(lval));
  // 4. If lbool is false, return lval.
  if (lbool === Value.true) {
    return lval;
  }
  // 5. Let rref be the result of evaluating LogicalANDExpression.
  const rref = yield* Evaluate(LogicalANDExpression);
  // 6. Return ? GetValue(rref).
  return Q(yield* GetValue(rref));
}
