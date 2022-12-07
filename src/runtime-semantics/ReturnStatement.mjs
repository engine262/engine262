import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { GetValue, GetGeneratorKind } from '../abstract-ops/all.mjs';
import {
  Completion,
  Await,
  Q, X,
} from '../completion.mjs';

/** http://tc39.es/ecma262/#sec-return-statement-runtime-semantics-evaluation */
//  ReturnStatement :
//    `return` `;`
//    `return` Expression `;`
export function* Evaluate_ReturnStatement({ Expression }) {
  if (!Expression) {
    // 1. Return Completion { [[Type]]: return, [[Value]]: undefined, [[Target]]: empty }.
    return new Completion({ Type: 'return', Value: Value.undefined, Target: undefined });
  }
  // 1. Let exprRef be the result of evaluating Expression.
  const exprRef = yield* Evaluate(Expression);
  // 1. Let exprValue be ? GetValue(exprRef).
  let exprValue = Q(GetValue(exprRef));
  // 1. If ! GetGeneratorKind() is async, set exprValue to ? Await(exprValue).
  if (X(GetGeneratorKind()) === 'async') {
    exprValue = Q(yield* Await(exprValue));
  }
  // 1. Return Completion { [[Type]]: return, [[Value]]: exprValue, [[Target]]: empty }.
  return new Completion({ Type: 'return', Value: exprValue, Target: undefined });
}
