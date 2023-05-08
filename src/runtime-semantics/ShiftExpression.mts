// @ts-nocheck
import { Q } from '../completion.mjs';
import { EvaluateStringOrNumericBinaryExpression } from './all.mjs';

/** https://tc39.es/ecma262/#sec-left-shift-operator-runtime-semantics-evaluation */
//  ShiftExpression :
//    ShiftExpression `<<` AdditiveExpression
/** https://tc39.es/ecma262/#sec-signed-right-shift-operator-runtime-semantics-evaluation */
//  ShiftExpression :
//    ShiftExpression `>>` AdditiveExpression
/** https://tc39.es/ecma262/#sec-unsigned-right-shift-operator-runtime-semantics-evaluation */
//  ShiftExpression :
//    ShiftExpression `>>>` AdditiveExpression
export function* Evaluate_ShiftExpression({ ShiftExpression, operator, AdditiveExpression }) {
  return Q(yield* EvaluateStringOrNumericBinaryExpression(ShiftExpression, operator, AdditiveExpression));
}
