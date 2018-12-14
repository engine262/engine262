import { Value } from '../value.mjs';
import { Q } from '../completion.mjs';
import { GetValue, ToNumber } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';

export function EvaluateBinopValues_ExponentiationExpression(lval, rval) {
  const base = Q(ToNumber(lval));
  const exponent = Q(ToNumber(rval));
  return new Value(base.numberValue() ** exponent.numberValue());
}

// #sec-exp-operator-runtime-semantics-evaluation
// ExponentiationExpression : UpdateExpression ** ExponentiationExpression
export function* Evaluate_ExponentiationExpression({
  left: UpdateExpression,
  right: ExponentiationExpression,
}) {
  const left = yield* Evaluate(UpdateExpression);
  const leftValue = Q(GetValue(left));
  const right = yield* Evaluate(ExponentiationExpression);
  const rightValue = Q(GetValue(right));
  return EvaluateBinopValues_ExponentiationExpression(leftValue, rightValue);
}
