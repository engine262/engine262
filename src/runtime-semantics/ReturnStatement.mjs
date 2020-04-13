import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { GetValue, GetGeneratorKind } from '../abstract-ops/all.mjs';
import {
  Q, X,
  ReturnCompletion,
  Await,
} from '../completion.mjs';

// #sec-return-statement-runtime-semantics-evaluation
//  ReturnStatement :
//    `return` `;`
//    `return` Expression `;`
export function* Evaluate_ReturnStatement({ Expression }) {
  if (Expression === null) {
    // 1. Return Completion { [[Type]]: return, [[Value]]: undefined, [[Target]]: empty }.
    return new ReturnCompletion(Value.undefined);
  }
  // 1. Let exprRef be the result of evaluating Expression.
  const exprRef = yield* Evaluate(Expression);
  // 1. Let exprValue be ? GetValue(exprRef).
  let exprValue = Q(GetValue(exprRef));
  // 1. If ! GetGeneratorKind() is async, set exprValue to ? Await(exprValue).
  if (X(GetGeneratorKind()) === 'async') {
    exprValue = Q(Await(exprValue));
  }
  // 1. Return Completion { [[Type]]: return, [[Value]]: exprValue, [[Target]]: empty }.
  return new ReturnCompletion(exprValue);
}
