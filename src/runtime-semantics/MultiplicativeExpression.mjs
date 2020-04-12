import { surroundingAgent } from '../engine.mjs';
import { Assert, GetValue, ToNumeric } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { Type, TypeNumeric } from '../value.mjs';

// #sec-multiplicative-operators-runtime-semantics-evaluation
//   MultiplicativeExpression :
//     MultiplicativeExpression MultiplicativeOperator ExponentiationExpression
export function* Evaluate_MultiplicativeExpression({
  MultiplicativeExpression,
  MultiplicativeOperator,
  ExponentiationExpression,
}) {
  // 1. Let left be the result of evaluating MultiplicativeExpression.
  const left = yield* Evaluate(MultiplicativeExpression);
  // 2. Let leftValue be ? GetValue(left).
  const leftValue = Q(GetValue(left));
  // 3. Let right be the result of evaluating ExponentiationExpression.
  const right = yield* Evaluate(ExponentiationExpression);
  // 4. Let rightValue be ? GetValue(right).
  const rightValue = Q(GetValue(right));
  return EvaluateBinopValues_MultiplicativeExpression(
    MultiplicativeOperator, leftValue, rightValue,
  );
}

export function EvaluateBinopValues_MultiplicativeExpression(MultiplicativeOperator, lval, rval) {
  // 5. Let lnum be ? ToNumeric(leftValue).
  const lnum = Q(ToNumeric(lval));
  // 6. Let rnum be ? ToNumeric(rightValue).
  const rnum = Q(ToNumeric(rval));
  // 7. If Type(lnum) is different from Type(rnum), throw a TypeError exception.
  if (Type(lnum) !== Type(rnum)) {
    return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
  }
  // 8. Let T be Type(lnum).
  const T = TypeNumeric(lnum);
  // 9. If MultiplicativeOperator is *, return T::multiply(lnum, rnum).
  if (MultiplicativeOperator === '*') {
    return T.multiply(lnum, rnum);
  }
  // 10. If MultiplicativeOperator is /, return T::divide(lnum, rnum).
  if (MultiplicativeOperator === '/') {
    return T.divide(lnum, rnum);
  }
  // 11. Else,
  //   a. Assert: MultiplicativeOperator is %.
  //   b. Return T::remainder(lnum, rnum).
  Assert(MultiplicativeOperator === '%');
  return T.remainder(lnum, rnum);
}
