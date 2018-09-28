import { Evaluate_Expression } from '../evaluator.mjs';
import { GetValue, ToBoolean } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// #sec-conditional-operator-runtime-semantics-evaluation
// ConditionalExpression : LogicalORExpression `?` AssignmentExpression `:` AssignmentExpression
export function* Evaluate_ConditionalExpression({
  test: LogicalORExpression,
  consequent: FirstAssignmentExpression,
  alternate: SecondAssignmentExpression,
}) {
  const lref = yield* Evaluate_Expression(LogicalORExpression);
  const lval = ToBoolean(Q(GetValue(lref)));
  if (lval.isTrue()) {
    const trueRef = yield* Evaluate_Expression(FirstAssignmentExpression);
    return Q(GetValue(trueRef));
  } else {
    const falseRef = yield* Evaluate_Expression(SecondAssignmentExpression);
    return Q(GetValue(falseRef));
  }
}
