import {
  GetValue,
  ToInt32,
} from '../abstract-ops/all.mjs';
import { New as NewValue } from '../value.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';

/* eslint-disable no-bitwise */

export function EvaluateBinopValues_BitwiseANDExpression(lval, rval) {
  const lnum = Q(ToInt32(lval));
  const rnum = Q(ToInt32(rval));
  return NewValue(lnum.numberValue() & rnum.numberValue());
}

export function EvaluateBinopValues_BitwiseXORExpression(lval, rval) {
  const lnum = Q(ToInt32(lval));
  const rnum = Q(ToInt32(rval));
  return NewValue(lnum.numberValue() ^ rnum.numberValue());
}

export function EvaluateBinopValues_BitwiseORExpression(lval, rval) {
  const lnum = Q(ToInt32(lval));
  const rnum = Q(ToInt32(rval));
  return NewValue(lnum.numberValue() | rnum.numberValue());
}

// #sec-binary-bitwise-operators-runtime-semantics-evaluation
export function* Evaluate_BinaryBitwiseExpression({ left: A, operator, right: B }) {
  const lref = yield* Evaluate_Expression(A);
  const lval = Q(GetValue(lref));
  const rref = yield* Evaluate_Expression(B);
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
      throw outOfRange('Evaluate_BinaryBiwise', operator);
  }
}
