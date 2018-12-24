import { Evaluate } from '../evaluator.mjs';
import { Value } from '../value.mjs';
import { GetValue, ToBoolean } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// 12.14.3 #sec-conditional-operator-runtime-semantics-evaluation
// ConditionalExpression : LogicalORExpression `?` AssignmentExpression `:` AssignmentExpression
export function* Evaluate_ConditionalExpression({
  test: LogicalORExpression,
  consequent: FirstAssignmentExpression,
  alternate: SecondAssignmentExpression,
}) {
  const lref = yield* Evaluate(LogicalORExpression);
  const lval = ToBoolean(Q(GetValue(lref)));
  if (lval === Value.true) {
    const trueRef = yield* Evaluate(FirstAssignmentExpression);
    return Q(GetValue(trueRef));
  } else {
    const falseRef = yield* Evaluate(SecondAssignmentExpression);
    return Q(GetValue(falseRef));
  }
}
