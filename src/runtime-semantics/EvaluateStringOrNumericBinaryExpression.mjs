import { Evaluate } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { ApplyStringOrNumericBinaryOperator } from './all.mjs';

/** http://tc39.es/ecma262/#sec-evaluatestringornumericbinaryexpression  */
export function* EvaluateStringOrNumericBinaryExpression(leftOperand, opText, rightOperand) {
  // 1. Let lref be the result of evaluating leftOperand.
  const lref = yield* Evaluate(leftOperand);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(GetValue(lref));
  // 3. Let rref be the result of evaluating rightOperand.
  const rref = yield* Evaluate(rightOperand);
  // 4. Let rval be ? GetValue(rref).
  const rval = Q(GetValue(rref));
  // 5. Return ? ApplyStringOrNumericBinaryOperator(lval, opText, rval).
  return Q(ApplyStringOrNumericBinaryOperator(lval, opText, rval));
}
