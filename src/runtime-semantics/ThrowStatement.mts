import {
  Evaluate,
} from '../evaluator.mts';
import {
  GetValue,
} from '../abstract-ops/all.mts';
import {
  Q,
  ThrowCompletion,
} from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-throw-statement-runtime-semantics-evaluation */
// ThrowStatement : `throw` Expression `;`
export function* Evaluate_ThrowStatement({ Expression }: ParseNode.ThrowStatement) {
  // 1. Let exprRef be the result of evaluating Expression.
  const exprRef = Q(yield* Evaluate(Expression));
  // 2. Let exprValue be ? GetValue(exprRef).
  const exprValue = Q(yield* GetValue(exprRef));
  // 3. Return ThrowCompletion(exprValue).
  return ThrowCompletion(exprValue);
}
