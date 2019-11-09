import { surroundingAgent } from '../engine.mjs';
import { GetValue, ToNumeric } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { Type, TypeNumeric } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

export function EvaluateBinopValues_MultiplicativeExpression(MultiplicativeOperator, lval, rval) {
  const lnum = Q(ToNumeric(lval));
  const rnum = Q(ToNumeric(rval));

  if (Type(lnum) !== Type(rnum)) {
    return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
  }

  const T = TypeNumeric(lnum);

  switch (MultiplicativeOperator) {
    case '*':
      return T.multiply(lnum, rnum);
    case '/':
      return T.divide(lnum, rnum);
    case '%':
      return T.remainder(lnum, rnum);

    default:
      throw new OutOfRange('EvaluateBinopValues_MultiplicativeExpression', MultiplicativeOperator);
  }
}

export function* Evaluate_MultiplicativeExpression({
  left: MultiplicativeExpression,
  operator: MultiplicativeOperator,
  right: ExponentiationExpression,
}) {
  const left = yield* Evaluate(MultiplicativeExpression);
  const leftValue = Q(GetValue(left));
  const right = yield* Evaluate(ExponentiationExpression);
  const rightValue = Q(GetValue(right));
  return EvaluateBinopValues_MultiplicativeExpression(
    MultiplicativeOperator, leftValue, rightValue,
  );
}
