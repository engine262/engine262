import { Q } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { EvaluateStringOrNumericBinaryExpression } from './all.mts';

/** https://tc39.es/ecma262/#sec-exp-operator-runtime-semantics-evaluation */
// ExponentiationExpression : UpdateExpression ** ExponentiationExpression
export function* Evaluate_ExponentiationExpression({ UpdateExpression, ExponentiationExpression }: ParseNode.ExponentiationExpression) {
  // 1. Return ? EvaluateStringOrNumericBinaryExpression(UpdateExpression, **, ExponentiationExpression).
  return Q(yield* EvaluateStringOrNumericBinaryExpression(UpdateExpression, '**', ExponentiationExpression));
}
