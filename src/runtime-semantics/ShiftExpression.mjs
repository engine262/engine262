import { Q } from '../completion.mjs';
import { EvaluateStringOrNumericBinaryExpression } from './all.mjs';

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
  return Q(yield* EvaluateStringOrNumericBinaryExpression(ShiftExpression, operator, AdditiveExpression));
}
