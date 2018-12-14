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
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

export function EvaluateBinopValues_AdditiveExpression_Plus(lval, rval) {
  const lprim = Q(ToPrimitive(lval));
  const rprim = Q(ToPrimitive(rval));
  if (Type(lprim) === 'String' || Type(rprim) === 'String') {
    const lstr = Q(ToString(lprim));
    const rstr = Q(ToString(rprim));
    return new Value(lstr.stringValue() + rstr.stringValue());
  }
  const lnum = Q(ToNumber(lprim));
  const rnum = Q(ToNumber(rprim));
  return new Value(lnum.numberValue() + rnum.numberValue());
}

// #sec-addition-operator-plus-runtime-semantics-evaluation
//  AdditiveExpression : AdditiveExpression + MultiplicativeExpression
function* Evaluate_AdditiveExpression_Plus(AdditiveExpression, MultiplicativeExpression) {
  const lref = yield* Evaluate(AdditiveExpression);
  const lval = Q(GetValue(lref));
  const rref = yield* Evaluate(MultiplicativeExpression);
  const rval = Q(GetValue(rref));
  return EvaluateBinopValues_AdditiveExpression_Plus(lval, rval);
}

export function EvaluateBinopValues_AdditiveExpression_Minus(lval, rval) {
  const lnum = Q(ToNumber(lval));
  const rnum = Q(ToNumber(rval));
  return new Value(lnum.numberValue() - rnum.numberValue());
}

// #sec-subtraction-operator-minus-runtime-semantics-evaluation
function* Evaluate_AdditiveExpression_Minus(
  AdditiveExpression, MultiplicativeExpression,
) {
  const lref = yield* Evaluate(AdditiveExpression);
  const lval = Q(GetValue(lref));
  const rref = yield* Evaluate(MultiplicativeExpression);
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
      throw new OutOfRange('Evaluate_AdditiveExpression', AdditiveExpression);
  }
}
