import { surroundingAgent } from '../engine.mjs';
import { Type, TypeNumeric } from '../value.mjs';
import { Q } from '../completion.mjs';
import { GetValue, ToNumeric } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';

export function EvaluateBinopValues_ExponentiationExpression(lval, rval) {
  const base = Q(ToNumeric(lval));
  const exponent = Q(ToNumeric(rval));
  if (Type(base) !== Type(exponent)) {
    return surroundingAgent.Throw('TypeError');
  }
  return Q(TypeNumeric(base).exponentiate(base, exponent));
}

// 12.6.3 #sec-exp-operator-runtime-semantics-evaluation
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
