import { Evaluate } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// 12.16.3 #sec-comma-operator-runtime-semantics-evaluation
// Expression : Expression `,` AssignmentExpression
export function* Evaluate_ExpressionWithComma(ExpressionWithComma) {
  const expressions = [...ExpressionWithComma.expressions];
  const AssignmentExpression = expressions.pop();
  for (const Expression of expressions) {
    const lref = yield* Evaluate(Expression);
    Q(GetValue(lref));
  }
  const rref = yield* Evaluate(AssignmentExpression);
  return Q(GetValue(rref));
}
