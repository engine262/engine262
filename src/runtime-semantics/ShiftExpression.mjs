import { Evaluate_Expression } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { GetValue, ToInt32, ToUint32 } from '../abstract-ops/all.mjs';
import { New as NewValue } from '../value.mjs';
import { outOfRange } from '../helpers.mjs';

/* eslint-disable no-bitwise */

export function EvaluateBinopValues_ShiftExpression(operator, lval, rval) {
  switch (operator) {
    case '<<': {
      const lnum = Q(ToInt32(lval));
      const rnum = Q(ToUint32(rval));
      const shiftCount = rnum.numberValue() & 0x1F;
      return NewValue(lnum.numberValue() << shiftCount);
    }

    case '>>': {
      const lnum = Q(ToInt32(lval));
      const rnum = Q(ToUint32(rval));
      const shiftCount = rnum.numberValue() & 0x1F;
      return NewValue(lnum.numberValue() >> shiftCount);
    }

    case '>>>': {
      const lnum = Q(ToUint32(lval));
      const rnum = Q(ToUint32(rval));
      const shiftCount = rnum.numberValue() & 0x1F;
      return NewValue(lnum.numberValue() >>> shiftCount);
    }

    default:
      throw outOfRange('EvaluateBinopValues_ShiftExpression', operator);
  }
}

// ShiftExpression :
//   ShiftExpression << AdditiveExpression
//   ShiftExpression >> AdditiveExpression
//   ShiftExpression >>> AdditiveExpression
export function Evaluate_ShiftExpression({
  left: ShiftExpression,
  operator,
  right: AdditiveExpression,
}) {
  const lref = Q(Evaluate_Expression(ShiftExpression));
  const lval = Q(GetValue(lref));
  const rref = Q(Evaluate_Expression(AdditiveExpression));
  const rval = Q(GetValue(rref));
  return EvaluateBinopValues_ShiftExpression(operator, lval, rval);
}
