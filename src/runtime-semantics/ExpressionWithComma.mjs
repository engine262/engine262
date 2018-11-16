import { Evaluate_Expression } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// #sec-comma-operator-runtime-semantics-evaluation
// Expression : Expression `,` AssignmentExpression
export function* Evaluate_ExpressionWithComma(ExpressionWithComma) {
  const expressions = [...ExpressionWithComma.expressions];
  const AssignmentExpression = expressions.pop();
  for (const Expression of expressions) {
    const lref = yield* Evaluate_Expression(Expression);
    Q(GetValue(lref));
  }
  const rref = yield* Evaluate_Expression(AssignmentExpression);
  return Q(GetValue(rref));
}
