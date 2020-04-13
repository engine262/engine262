import { Value } from '../value.mjs';
import { GetValue, ToBoolean } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q, X } from '../completion.mjs';

// #sec-binary-logical-operators-runtime-semantics-evaluation
//   LogicalANDExpression :
//     LogicalANDExpression `&&` BitwiseORExpression
export function* Evaluate_LogicalANDExpression({ LogicalANDExpression, BitwiseORExpression }) {
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
