import { Evaluate } from '../evaluator.mjs';
import { Value } from '../value.mjs';
import { GetValue, ToBoolean } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// 12.14.3 #sec-conditional-operator-runtime-semantics-evaluation
// ConditionalExpression : ShortCircuitExpression `?` AssignmentExpression `:` AssignmentExpression
export function* Evaluate_ConditionalExpression({
  test: ShortCircuitExpression,
  consequent: FirstAssignmentExpression,
  alternate: SecondAssignmentExpression,
}) {
  // 1. Let lref be the result of evaluating ShortCircuitExpression.
  const lref = yield* Evaluate(ShortCircuitExpression);
  // 2. Let lval be ! ToBoolean(? GetValue(lref)).
  const lval = ToBoolean(Q(GetValue(lref)));
  // 3. If lval is true, then
  if (lval === Value.true) {
    // a. Let trueRef be the result of evaluating the first AssignmentExpression.
    const trueRef = yield* Evaluate(FirstAssignmentExpression);
    // b. Return ? GetValue(trueRef).
    return Q(GetValue(trueRef));
  } else {
    // a. Let falseRef be the result of evaluating the second AssignmentExpression.
    const falseRef = yield* Evaluate(SecondAssignmentExpression);
    // b. Return ? GetValue(falseRef).
    return Q(GetValue(falseRef));
  }
}
