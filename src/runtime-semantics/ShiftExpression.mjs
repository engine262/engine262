import { surroundingAgent } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { GetValue, ToNumeric } from '../abstract-ops/all.mjs';
import { Type, TypeNumeric } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-left-shift-operator-runtime-semantics-evaluation
//  ShiftExpression :
//    ShiftExpression `<<` AdditiveExpression
// #sec-signed-right-shift-operator-runtime-semantics-evaluation
//  ShiftExpression :
//    ShiftExpression `>>` AdditiveExpression
// #sec-unsigned-right-shift-operator-runtime-semantics-evaluation
//  ShiftExpression :
//    ShiftExpression `>>>` AdditiveExpression
export function* Evaluate_ShiftExpression({ ShiftExpression, operator, AdditiveExpression }) {
  // 1. Let lref be the result of evaluating ShiftExpression.
  const lref = yield* Evaluate(ShiftExpression);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(GetValue(lref));
  // 3. Let rref be the result of evaluating AdditiveExpression.
  const rref = yield* Evaluate(AdditiveExpression);
  // 4. Let rval be ? GetValue(rref).
  const rval = Q(GetValue(rref));
  return EvaluateBinopValues_ShiftExpression(operator, lval, rval);
}

export function EvaluateBinopValues_ShiftExpression(operator, lval, rval) {
  // 5. Let lnum be ? ToNumeric(lval).
  const lnum = Q(ToNumeric(lval));
  // 6. Let rnum be ? ToNumeric(rval).
  const rnum = Q(ToNumeric(rval));
  // 7. If Type(lnum) is different from Type(rnum), throw a TypeError exception.
  if (Type(lnum) !== Type(rnum)) {
    return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
  }
  // 8. Let T be Type(lnum).
  const T = TypeNumeric(lnum);
  switch (operator) {
    case '<<':
      // 9. Return T::leftShift(lnum, rnum).
      return T.leftShift(lnum, rnum);
    case '>>':
      // 9. Return T::signedRightShift(lnum, rnum).
      return T.signedRightShift(lnum, rnum);
    case '>>>':
      // 9. Return T::unsignedRightShift(lnum, rnum).
      return T.unsignedRightShift(lnum, rnum);
    default:
      throw new OutOfRange('EvaluateBinopValues_ShiftExpression', operator);
  }
}
