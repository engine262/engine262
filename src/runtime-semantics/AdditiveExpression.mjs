import { surroundingAgent } from '../engine.mjs';
import {
  isAdditiveExpressionWithMinus,
  isAdditiveExpressionWithPlus,
} from '../ast.mjs';
import {
  GetValue,
  ToNumeric,
  ToPrimitive,
  ToString,
} from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  Type,
  TypeNumeric,
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
  const lnum = Q(ToNumeric(lprim));
  const rnum = Q(ToNumeric(rprim));
  if (Type(lnum) !== Type(rnum)) {
    return surroundingAgent.Throw('TypeError');
  }
  const T = TypeNumeric(lnum);
  return T.add(lnum, rnum);
}

// 12.8.3.1 #sec-addition-operator-plus-runtime-semantics-evaluation
//  AdditiveExpression : AdditiveExpression + MultiplicativeExpression
function* Evaluate_AdditiveExpression_Plus(AdditiveExpression, MultiplicativeExpression) {
  const lref = yield* Evaluate(AdditiveExpression);
  const lval = Q(GetValue(lref));
  const rref = yield* Evaluate(MultiplicativeExpression);
  const rval = Q(GetValue(rref));
  return EvaluateBinopValues_AdditiveExpression_Plus(lval, rval);
}

export function EvaluateBinopValues_AdditiveExpression_Minus(lval, rval) {
  const lnum = Q(ToNumeric(lval));
  const rnum = Q(ToNumeric(rval));
  if (Type(lnum) !== Type(rnum)) {
    return surroundingAgent.Throw('TypeError');
  }
  const T = TypeNumeric(lnum);
  return T.subtract(lnum, rnum);
}

// 12.8.4.1 #sec-subtraction-operator-minus-runtime-semantics-evaluation
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
