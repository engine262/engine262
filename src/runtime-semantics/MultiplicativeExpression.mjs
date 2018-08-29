import {
  GetValue,
  ToNumber,
} from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  New as NewValue,
} from '../value.mjs';

export function Evaluate_MultiplicativeExpression({
  left: MultiplicativeExpression,
  operator: MultiplicativeOperator,
  right: ExponentiationExpression,
}) {
  const left = Evaluate(MultiplicativeExpression);
  const leftValue = Q(GetValue(left));
  const right = Evaluate(ExponentiationExpression);
  const rightValue = Q(GetValue(right));
  const lnum = Q(ToNumber(leftValue));
  const rnum = Q(ToNumber(rightValue));

  // Return the result of applying the MultiplicativeOperator (*, /, or %)
  // to lnum and rnum as specified in 12.7.3.1, 12.7.3.2, or 12.7.3.3.
  switch (MultiplicativeOperator) {
    case '*':
      return NewValue(lnum.numberValue() * rnum.numberValue());
    case '/':
      return NewValue(lnum.numberValue() / rnum.numberValue());
    case '%':
      return NewValue(lnum.numberValue() % rnum.numberValue());

    default:
      throw new RangeError(`${MultiplicativeOperator}`);
  }
}
