import {
  isAdditiveExpressionWithMinus,
  isAdditiveExpressionWithPlus,
} from '../ast.mjs';
import {
  GetValue,
  ToNumber,
  ToPrimitive,
  ToString,
} from '../abstract-ops/all.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  New as NewValue,
  Type,
} from '../value.mjs';
import { outOfRange } from '../helpers.mjs';

export function EvaluateBinopValues_AdditiveExpression_Plus(lval, rval) {
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

// #sec-addition-operator-plus-runtime-semantics-evaluation
//  AdditiveExpression : AdditiveExpression + MultiplicativeExpression
function* Evaluate_AdditiveExpression_Plus(AdditiveExpression, MultiplicativeExpression) {
  const lref = yield* Evaluate_Expression(AdditiveExpression);
  const lval = Q(GetValue(lref));
  const rref = yield* Evaluate_Expression(MultiplicativeExpression);
  const rval = Q(GetValue(rref));
  return EvaluateBinopValues_AdditiveExpression_Plus(lval, rval);
}

export function EvaluateBinopValues_AdditiveExpression_Minus(lval, rval) {
  const lnum = Q(ToNumber(lval));
  const rnum = Q(ToNumber(rval));
  return NewValue(lnum.numberValue() - rnum.numberValue());
}

// #sec-subtraction-operator-minus-runtime-semantics-evaluation
function* Evaluate_AdditiveExpression_Minus(
  AdditiveExpression, MultiplicativeExpression,
) {
  const lref = yield* Evaluate_Expression(AdditiveExpression);
  const lval = Q(GetValue(lref));
  const rref = yield* Evaluate_Expression(MultiplicativeExpression);
  const rval = Q(GetValue(rref));
  return EvaluateBinopValues_AdditiveExpression_Minus(lval, rval);
}

export function* Evaluate_AdditiveExpression(AdditiveExpression) {
  switch (true) {
    case isAdditiveExpressionWithPlus(AdditiveExpression):
      return yield* Evaluate_AdditiveExpression_Plus(
        AdditiveExpression.left, AdditiveExpression.right,
      );
    case isAdditiveExpressionWithMinus(AdditiveExpression):
      return yield* Evaluate_AdditiveExpression_Minus(
        AdditiveExpression.left, AdditiveExpression.right,
      );

    default:
      throw outOfRange('Evaluate_AdditiveExpression', AdditiveExpression);
  }
}
