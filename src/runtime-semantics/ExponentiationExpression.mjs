import { surroundingAgent } from '../engine.mjs';
import { Type, TypeNumeric } from '../value.mjs';
import { Q } from '../completion.mjs';
import { GetValue, ToNumeric } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';

// #sec-exp-operator-runtime-semantics-evaluation
// ExponentiationExpression : UpdateExpression ** ExponentiationExpression
export function* Evaluate_ExponentiationExpression({ UpdateExpression, ExponentiationExpression }) {
  // 1. Let left be the result of evaluating UpdateExpression.
  const left = yield* Evaluate(UpdateExpression);
  // 2. Let leftValue be ? GetValue(left).
  const leftValue = Q(GetValue(left));
  // 3. Let right be the result of evaluating ExponentiationExpression.
  const right = yield* Evaluate(ExponentiationExpression);
  // 4. Let rightValue be ? GetValue(right).
  const rightValue = Q(GetValue(right));
  return EvaluateBinopValues_ExponentiationExpression(leftValue, rightValue);
}

export function EvaluateBinopValues_ExponentiationExpression(lval, rval) {
  // 5. Let base be ? ToNumeric(leftValue).
  const base = Q(ToNumeric(lval));
  // 6. Let exponent be ? ToNumeric(rightValue).
  const exponent = Q(ToNumeric(rval));
  // 7. If Type(base) is different from Type(exponent), throw a TypeError exception.
  if (Type(base) !== Type(exponent)) {
    return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
  }
  // 8. Return ? Type(base)::exponentiate(base, exponent).
  return Q(TypeNumeric(base).exponentiate(base, exponent));
}
