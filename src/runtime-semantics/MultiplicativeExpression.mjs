import { Q } from '../completion.mjs';
import { EvaluateStringOrNumericBinaryExpression } from './all.mjs';

// #sec-multiplicative-operators-runtime-semantics-evaluation
//   MultiplicativeExpression :
//     MultiplicativeExpression MultiplicativeOperator ExponentiationExpression
export function* Evaluate_MultiplicativeExpression({
  MultiplicativeExpression,
  operator: MultiplicativeOperator,
  ExponentiationExpression,
}) {
  // 1. Let opText be the source text matched by MultiplicativeOperator.
  const opText = MultiplicativeOperator;
  // 2. Return ? EvaluateStringOrNumericBinaryExpression(MultiplicativeExpression, opText, ExponentiationExpression).
  return Q(yield* EvaluateStringOrNumericBinaryExpression(MultiplicativeExpression, opText, ExponentiationExpression));
}
