// @ts-nocheck
import { Evaluate } from '../evaluator.mts';
import { GetValue } from '../abstract-ops/all.mts';
import { Q } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-comma-operator-runtime-semantics-evaluation */
//   Expression :
//     AssignmentExpression
//     Expression `,` AssignmentExpression
export function* Evaluate_CommaOperator({ ExpressionList }: ParseNode.CommaOperator) {
  let result;
  for (const Expression of ExpressionList) {
    const lref = yield* Evaluate(Expression);
    result = Q(GetValue(lref));
  }
  return result;
}
