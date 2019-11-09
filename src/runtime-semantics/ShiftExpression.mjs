import { surroundingAgent } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { GetValue, ToNumeric } from '../abstract-ops/all.mjs';
import { Type, TypeNumeric } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

/* eslint-disable no-bitwise */

export function EvaluateBinopValues_ShiftExpression(operator, lval, rval) {
  const lnum = Q(ToNumeric(lval));
  const rnum = Q(ToNumeric(rval));
  if (Type(lnum) !== Type(rnum)) {
    return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
  }
  const T = TypeNumeric(lnum);

  switch (operator) {
    case '<<':
      return T.leftShift(lnum, rnum);

    case '>>':
      return T.signedRightShift(lnum, rnum);

    case '>>>':
      return T.unsignedRightShift(lnum, rnum);

    default:
      throw new OutOfRange('EvaluateBinopValues_ShiftExpression', operator);
  }
}

// ShiftExpression :
//   ShiftExpression << AdditiveExpression
//   ShiftExpression >> AdditiveExpression
//   ShiftExpression >>> AdditiveExpression
export function* Evaluate_ShiftExpression({
  left: ShiftExpression,
  operator,
  right: AdditiveExpression,
}) {
  const lref = yield* Evaluate(ShiftExpression);
  const lval = Q(GetValue(lref));
  const rref = yield* Evaluate(AdditiveExpression);
  const rval = Q(GetValue(rref));
  return EvaluateBinopValues_ShiftExpression(operator, lval, rval);
}
