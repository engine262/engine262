// @ts-nocheck
import {
  Evaluate,
} from '../evaluator.mjs';
import {
  GetValue,
} from '../abstract-ops/all.mjs';
import {
  Q,
  ThrowCompletion,
} from '../completion.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';

/** https://tc39.es/ecma262/#sec-throw-statement-runtime-semantics-evaluation */
// ThrowStatement : `throw` Expression `;`
export function* Evaluate_ThrowStatement({ Expression }: ParseNode.ThrowStatement) {
  // 1. Let exprRef be the result of evaluating Expression.
  const exprRef = yield* Evaluate(Expression);
  // 2. Let exprValue be ? GetValue(exprRef).
  const exprValue = Q(GetValue(exprRef));
  // 3. Return ThrowCompletion(exprValue).
  return ThrowCompletion(exprValue);
}
