import {
  GetValue,
  ToNumber,
} from '../abstract-ops/all.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  Value,
} from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

export function EvaluateBinopValues_MultiplicativeExpression(MultiplicativeOperator, lval, rval) {
  const lnum = Q(ToNumber(lval));
  const rnum = Q(ToNumber(rval));

  // Return the result of applying the MultiplicativeOperator (*, /, or %)
  // to lnum and rnum as specified in 12.7.3.1, 12.7.3.2, or 12.7.3.3.
  switch (MultiplicativeOperator) {
    case '*':
      return new Value(lnum.numberValue() * rnum.numberValue());
    case '/':
      return new Value(lnum.numberValue() / rnum.numberValue());
    case '%':
      return new Value(lnum.numberValue() % rnum.numberValue());

    default:
      throw new OutOfRange('EvaluateBinopValues_MultiplicativeExpression', MultiplicativeOperator);
  }
}

export function* Evaluate_MultiplicativeExpression({
  left: MultiplicativeExpression,
  operator: MultiplicativeOperator,
  right: ExponentiationExpression,
}) {
  const left = yield* Evaluate_Expression(MultiplicativeExpression);
  const leftValue = Q(GetValue(left));
  const right = yield* Evaluate_Expression(ExponentiationExpression);
  const rightValue = Q(GetValue(right));
  return EvaluateBinopValues_MultiplicativeExpression(
    MultiplicativeOperator, leftValue, rightValue,
  );
}
