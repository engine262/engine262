import {
  isAdditiveExpressionWithPlus,
  isAdditiveExpressionWithMinus,
} from '../ast.mjs';
import {
  GetValue,
  ToPrimitive,
  ToNumber,
  ToString,
} from '../abstract-ops/all.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  Type,
  New as NewValue,
} from '../value.mjs';

// #sec-addition-operator-plus-runtime-semantics-evaluation
//  AdditiveExpression : AdditiveExpression + MultiplicativeExpression
function AdditiveExpression_MultiplicativeExpression(AdditiveExpression, MultiplicativeExpression) {
  const lref = Evaluate_Expression(AdditiveExpression);
  const lval = Q(GetValue(lref));
  const rref = Evaluate_Expression(MultiplicativeExpression);
  const rval = Q(GetValue(rref));
  const lprim = Q(ToPrimitive(lval));
  const rprim = Q(ToPrimitive(rval));
  if (Type(lprim) === 'String' || Type(rprim) === 'String') {
    const lstr = Q(ToString(lprim));
    const rstr = Q(ToString(rprim));
    return NewValue(lstr.stringValue() + rstr.stringValue());
  }
  const lnum = Q(ToNumber(lprim));
  const rnum = Q(ToNumber(rprim));
  return NewValue(lnum.numberValue() + rnum.numberValue());
}

// #sec-subtraction-operator-minus-runtime-semantics-evaluation
function SubtractiveExpression_MultiplicativeExpression(
  SubtractiveExpression, MultiplicativeExpression,
) {
  const lref = Evaluate_Expression(SubtractiveExpression);
  const lval = Q(GetValue(lref));
  const rref = Evaluate_Expression(MultiplicativeExpression);
  const rval = Q(GetValue(rref));
  const lnum = Q(ToNumber(lval));
  const rnum = Q(ToNumber(rval));
  return NewValue(lnum.numberValue() - rnum.numberValue());
}

export function Evaluate_AdditiveExpression(AdditiveExpression) {
  switch (true) {
    case isAdditiveExpressionWithPlus(AdditiveExpression):
      return AdditiveExpression_MultiplicativeExpression(
        AdditiveExpression.left, AdditiveExpression.right,
      );
    case isAdditiveExpressionWithMinus(AdditiveExpression):
      return SubtractiveExpression_MultiplicativeExpression(
        AdditiveExpression.left, AdditiveExpression.right,
      );

    default:
      throw new RangeError('Unknown AdditiveExpression type');
  }
}
