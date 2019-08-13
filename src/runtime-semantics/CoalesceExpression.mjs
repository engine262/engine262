import { Q } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';

// https://tc39.es/proposal-nullish-coalescing/#sec-binary-logical-operators-runtime-semantics-evaluation
// CoalesceExpression : CoalesceExpressionHead `??` BitwiseORExpression
export function* Evaluate_CoalesceExpression({
  left: CoalesceExpressionHead,
  right: BitwiseORExpression,
}) {
  const lref = yield* Evaluate(CoalesceExpressionHead);
  const lval = Q(GetValue(lref));
  if (lval === Value.undefined || lval === Value.null) {
    const rref = yield* Evaluate(BitwiseORExpression);
    return Q(GetValue(rref));
  }
  return lval;
}
