import { Q } from '../completion.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';
import { EvaluateStringOrNumericBinaryExpression } from './all.mjs';

/** https://tc39.es/ecma262/#sec-exp-operator-runtime-semantics-evaluation */
// ExponentiationExpression : UpdateExpression ** ExponentiationExpression
export function* Evaluate_ExponentiationExpression({ UpdateExpression, ExponentiationExpression }: ParseNode.ExponentiationExpression) {
  // 1. Return ? EvaluateStringOrNumericBinaryExpression(UpdateExpression, **, ExponentiationExpression).
  return Q(yield* EvaluateStringOrNumericBinaryExpression(UpdateExpression, '**', ExponentiationExpression));
}
