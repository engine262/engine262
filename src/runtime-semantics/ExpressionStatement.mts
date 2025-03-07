// @ts-nocheck
import { GetValue } from '../abstract-ops/all.mts';
import { Evaluate } from '../evaluator.mts';
import { Q } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-expression-statement-runtime-semantics-evaluation */
//   ExpressionStatement :
//     Expression `;`
export function* Evaluate_ExpressionStatement({ Expression }: ParseNode.ExpressionStatement) {
  // 1. Let exprRef be the result of evaluating Expression.
  const exprRef = yield* Evaluate(Expression);
  // 2. Return ? GetValue(exprRef).
  return Q(GetValue(exprRef));
}
