import { surroundingAgent } from '../engine.mjs';
import { GetValue, ToNumeric } from '../abstract-ops/all.mjs';
import { Type, TypeNumeric } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-binary-bitwise-operators-runtime-semantics-evaluation
//   BitwiseANDExpression : BitwiseANDExpression `&` EqualityExpression
//   BitwiseXORExpression : BitwiseXORExpression `^` BitwiseANDExpression
//   BitwiseORExpression : BitwiseORExpression `|` BitwiseXORExpression
// The production A : A @ B, where @ is one of the bitwise operators in the
// productions above, is evaluated as follows:
export function* Evaluate_BinaryBitwiseExpression({ A, operator, B }) {
  // 1. Let lref be the result of evaluating A.
  const lref = yield* Evaluate(A);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(GetValue(lref));
  // 3. Let rref be the result of evaluating B.
  const rref = yield* Evaluate(B);
  // 4. Let rval be ? GetValue(rref).
  const rval = Q(GetValue(rref));

  // Return the result of applying the bitwise operator @ to lnum and rnum.
  switch (operator) {
    case '&':
      return EvaluateBinopValues_BitwiseANDExpression(lval, rval);
    case '^':
      return EvaluateBinopValues_BitwiseXORExpression(lval, rval);
    case '|':
      return EvaluateBinopValues_BitwiseORExpression(lval, rval);

    default:
      throw new OutOfRange('Evaluate_BinaryBiwise', operator);
  }
}

export function EvaluateBinopValues_BitwiseANDExpression(lval, rval) {
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
  // 9. If @ is &, return T::bitwiseAND(lnum, rnum).
  return T.bitwiseAND(lnum, rnum);
}

export function EvaluateBinopValues_BitwiseXORExpression(lval, rval) {
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
  // 11. Return T::bitwiseXOR(lnum, rnum).
  return T.bitwiseXOR(lnum, rnum);
}

export function EvaluateBinopValues_BitwiseORExpression(lval, rval) {
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
  // 10. If @ is |, return T::bitwiseOR(lnum, rnum).
  return T.bitwiseOR(lnum, rnum);
}
