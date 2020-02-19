import { surroundingAgent } from '../engine.mjs';
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

// #sec-addition-operator-plus-runtime-semantics-evaluation
//   AdditiveExpression : AdditiveExpression + MultiplicativeExpression
function* Evaluate_AdditiveExpression_Plus({ AdditiveExpression, MultiplicativeExpression }) {
  // 1. Let lref be the result of evaluating AdditiveExpression.
  const lref = yield* Evaluate(AdditiveExpression);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(GetValue(lref));
  // 3. Let rref be the result of evaluating MultiplicativeExpression.
  const rref = yield* Evaluate(MultiplicativeExpression);
  // 4. Let rval be ? GetValue(rref).
  const rval = Q(GetValue(rref));
  return EvaluateBinopValues_AdditiveExpression_Plus(lval, rval);
}

export function EvaluateBinopValues_AdditiveExpression_Plus(lval, rval) {
  // 5. Let lprim be ? ToPrimitive(lval).
  const lprim = Q(ToPrimitive(lval));
  // 6. Let rprim be ? ToPrimitive(rval).
  const rprim = Q(ToPrimitive(rval));
  // 7. If Type(lprim) is String or Type(rprim) is String, then
  if (Type(lprim) === 'String' || Type(rprim) === 'String') {
    // a. If Type(lprim) is String or Type(rprim) is String, then
    const lstr = Q(ToString(lprim));
    // b. Let lstr be ? ToString(lprim).
    const rstr = Q(ToString(rprim));
    // c. Return the string-concatenation of lstr and rstr.
    return new Value(lstr.stringValue() + rstr.stringValue());
  }
  // 8. Let lnum be ? ToNumeric(lprim).
  const lnum = Q(ToNumeric(lprim));
  // 9. Let rnum be ? ToNumeric(rprim).
  const rnum = Q(ToNumeric(rprim));
  // 10. If Type(lnum) is different from Type(rnum), throw a TypeError exception.
  if (Type(lnum) !== Type(rnum)) {
    return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
  }
  // 11. Let T be Type(lnum).
  const T = TypeNumeric(lnum);
  // 12. Return T::add(lnum, rnum).
  return T.add(lnum, rnum);
}

// 12.8.4.1 #sec-subtraction-operator-minus-runtime-semantics-evaluation
function* Evaluate_AdditiveExpression_Minus({ AdditiveExpression, MultiplicativeExpression }) {
  // 1. Let lref be the result of evaluating AdditiveExpression.
  const lref = yield* Evaluate(AdditiveExpression);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(GetValue(lref));
  // 3. Let rref be the result of evaluating MultiplicativeExpression.
  const rref = yield* Evaluate(MultiplicativeExpression);
  // 4. Let rval be ? GetValue(rref).
  const rval = Q(GetValue(rref));
  return EvaluateBinopValues_AdditiveExpression_Minus(lval, rval);
}

export function EvaluateBinopValues_AdditiveExpression_Minus(lval, rval) {
  // 5. Let lnum be ? ToNumeric(lval).
  const lnum = Q(ToNumeric(lval));
  // 6. Let rnum be ? ToNumeric(rval).
  const rnum = Q(ToNumeric(rval));
  // 7. f Type(lnum) is different from Type(rnum), throw a TypeError exception.
  if (Type(lnum) !== Type(rnum)) {
    return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
  }
  // 8. Let T be Type(lnum).
  const T = TypeNumeric(lnum);
  // 9. Return T::subtract(lnum, rnum).
  return T.subtract(lnum, rnum);
}

export function* Evaluate_AdditiveExpression(AdditiveExpression) {
  switch (AdditiveExpression.operator) {
    case '+':
      return yield* Evaluate_AdditiveExpression_Plus(AdditiveExpression);
    case '-':
      return yield* Evaluate_AdditiveExpression_Minus(AdditiveExpression);
    default:
      throw new OutOfRange('Evaluate_AdditiveExpression', AdditiveExpression);
  }
}
