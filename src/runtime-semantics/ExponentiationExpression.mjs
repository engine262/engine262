import { New as NewValue } from '../value.mjs';
import { Q } from '../completion.mjs';
import { GetValue, ToNumber } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';

// #sec-exp-operator-runtime-semantics-evaluation
// ExponentiationExpression : UpdateExpression ** ExponentiationExpression
export function Evaluate_ExponentiationExpression({
  left: UpdateExpression,
  right: ExponentiationExpression,
}) {
  const left = Evaluate(UpdateExpression);
  const leftValue = Q(GetValue(left));
  const right = Evaluate(ExponentiationExpression);
  const rightValue = Q(GetValue(right));
  const base = Q(ToNumber(leftValue));
  const exponent = Q(ToNumber(rightValue));
  return NewValue(base.numberValue() ** exponent.numberValue());
}
