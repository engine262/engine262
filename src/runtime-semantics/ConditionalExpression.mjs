import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { ToBoolean, GetValue } from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';

// #sec-conditional-operator-runtime-semantics-evaluation
//   ConditionalExpression :
//     ShortCircuitExpression `?` AssignmentExpression `:` AssignmentExpression
export function* Evaluate_ConditionalExpression({
  ShortCircuitExpression,
  AssignmentExpression_a,
  AssignmentExpression_b,
}) {
  // 1. Let lref be the result of evaluating ShortCircuitExpression.
  const lref = yield* Evaluate(ShortCircuitExpression);
  // 2. Let lval be ! ToBoolean(? GetValue(lref)).
  const lval = X(ToBoolean(Q(GetValue(lref))));
  // 3. If lval is true, then
  if (lval === Value.true) {
    // a. Let trueRef be the result of evaluating the first AssignmentExpression.
    const trueRef = yield* Evaluate(AssignmentExpression_a);
    // b. Return ? GetValue(trueRef).
    return Q(GetValue(trueRef));
  } else { // 4. Else,
    // a. Let falseRef be the result of evaluating the second AssignmentExpression.
    const falseRef = yield* Evaluate(AssignmentExpression_b);
    // b. Return ? GetValue(falseRef).
    return Q(GetValue(falseRef));
  }
}
