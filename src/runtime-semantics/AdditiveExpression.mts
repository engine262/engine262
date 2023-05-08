// @ts-nocheck
import { Q } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { EvaluateStringOrNumericBinaryExpression } from './all.mjs';

/** https://tc39.es/ecma262/#sec-addition-operator-plus-runtime-semantics-evaluation */
//   AdditiveExpression : AdditiveExpression + MultiplicativeExpression
function* Evaluate_AdditiveExpression_Plus({ AdditiveExpression, MultiplicativeExpression }) {
  // 1. Return ? EvaluateStringOrNumericBinaryExpression(AdditiveExpression, +, MultiplicativeExpression).
  return Q(yield* EvaluateStringOrNumericBinaryExpression(AdditiveExpression, '+', MultiplicativeExpression));
}

/** https://tc39.es/ecma262/#sec-subtraction-operator-minus-runtime-semantics-evaluation */
function* Evaluate_AdditiveExpression_Minus({ AdditiveExpression, MultiplicativeExpression }) {
  // 1. Return ? EvaluateStringOrNumericBinaryExpression(AdditiveExpression, -, MultiplicativeExpression).
  return Q(yield* EvaluateStringOrNumericBinaryExpression(AdditiveExpression, '-', MultiplicativeExpression));
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
