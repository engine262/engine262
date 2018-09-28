import { Evaluate_Expression } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// #sec-comma-operator-runtime-semantics-evaluation
// Expression : Expression `,` AssignmentExpression
export function* Evaluate_ExpressionWithComma(ExpressionWithComma) {
  const AssignmentExpression = ExpressionWithComma.expressions.pop();
  for (const Expression of ExpressionWithComma.expressions) {
    const lref = yield* Evaluate_Expression(Expression);
    Q(GetValue(lref));
  }
  const rref = yield* Evaluate_Expression(AssignmentExpression);
  return Q(GetValue(rref));
}
