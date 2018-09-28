import { New as NewValue } from '../value.mjs';
import { Q } from '../completion.mjs';
import { GetValue, ToNumber } from '../abstract-ops/all.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';

export function EvaluateBinopValues_ExponentiationExpression(lval, rval) {
  const base = Q(ToNumber(lval));
  const exponent = Q(ToNumber(rval));
  return NewValue(base.numberValue() ** exponent.numberValue());
}

// #sec-exp-operator-runtime-semantics-evaluation
// ExponentiationExpression : UpdateExpression ** ExponentiationExpression
export function* Evaluate_ExponentiationExpression({
  left: UpdateExpression,
  right: ExponentiationExpression,
}) {
  const left = yield* Evaluate_Expression(UpdateExpression);
  const leftValue = Q(GetValue(left));
  const right = yield* Evaluate_Expression(ExponentiationExpression);
  const rightValue = Q(GetValue(right));
  return EvaluateBinopValues_ExponentiationExpression(leftValue, rightValue);
}
