import { Q } from '../completion.mjs';
import { EvaluateStringOrNumericBinaryExpression } from './all.mjs';

// #sec-exp-operator-runtime-semantics-evaluation
// ExponentiationExpression : UpdateExpression ** ExponentiationExpression
export function* Evaluate_ExponentiationExpression({ UpdateExpression, ExponentiationExpression }) {
  // 1. Return ? EvaluateStringOrNumericBinaryExpression(UpdateExpression, **, ExponentiationExpression).
  return Q(yield* EvaluateStringOrNumericBinaryExpression(UpdateExpression, '**', ExponentiationExpression));
}
