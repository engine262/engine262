import { Evaluate_Expression } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// #sec-comma-operator-runtime-semantics-evaluation
// Expression : Expression `,` AssignmentExpression
export function Evaluate_ExpressionWithComma(ExpressionWithComma) {
  const AssignmentExpression = ExpressionWithComma.expressions.pop();
  for (const Expression of ExpressionWithComma.expressions) {
    const lref = Evaluate_Expression(Expression);
    Q(GetValue(lref));
  }
  const rref = Evaluate_Expression(AssignmentExpression);
  return Q(GetValue(rref));
}
