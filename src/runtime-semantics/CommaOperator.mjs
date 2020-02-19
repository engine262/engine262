import { Evaluate } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// #sec-comma-operator-runtime-semantics-evaluation
//   Expression :
//     AssignmentExpression
//     Expression `,` AssignmentExpression
export function* Evaluate_CommaOperator({ ExpressionList }) {
  const AssignmentExpression = ExpressionList.pop();
  for (const Expression of ExpressionList) {
    const lref = yield* Evaluate(Expression);
    Q(GetValue(lref));
  }
  const rref = yield* Evaluate(AssignmentExpression);
  return Q(GetValue(rref));
}
