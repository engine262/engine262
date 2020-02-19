import { Evaluate } from '../evaluator.mjs';
import {
  GetValue,
  ToBoolean,
} from '../abstract-ops/all.mjs';
import {
  Completion,
  EnsureCompletion,
  NormalCompletion,
  Q,
  UpdateEmpty,
} from '../completion.mjs';
import { Value } from '../value.mjs';

// #sec-if-statement-runtime-semantics-evaluation
// IfStatement :
//   `if` `(` Expression `)` Statement `else` Statement
//   `if` `(` Expression `)` Statement
export function* Evaluate_IfStatement({ Expression, Statement_a, Statement_b }) {
  // 1. Let exprRef be the result of evaluating Expression.
  const exprRef = yield* Evaluate(Expression);
  // 2. Let exprValue be ! ToBoolean(? GetValue(exprRef)).
  const exprValue = ToBoolean(Q(GetValue(exprRef)));
  if (Statement_b !== null) {
    let stmtCompletion;
    // 3. If exprValue is true, then
    if (exprValue === Value.true) {
      // a. Let stmtCompletion be the result of evaluating the first Statement.
      stmtCompletion = yield* Evaluate(Statement_a);
    } else { // 4. Else,
      // a. Let stmtCompletion be the result of evaluating the second Statement.
      stmtCompletion = yield* Evaluate(Statement_b);
    }
    // 5. Return Completion(UpdateEmpty(stmtCompletion, undefined)).
    return Completion(UpdateEmpty(EnsureCompletion(stmtCompletion), Value.undefined));
  } else {
    // 3. If exprValue is false, then
    if (exprValue === Value.false) {
      // a. Return NormalCompletion(undefined).
      return NormalCompletion(Value.undefined);
    } else { // 4. Else,
      // a. Let stmtCompletion be the result of evaluating Statement.
      const stmtCompletion = yield* Evaluate(Statement_a);
      // b. Return Completion(UpdateEmpty(stmtCompletion, undefined)).
      return Completion(UpdateEmpty(EnsureCompletion(stmtCompletion), Value.undefined));
    }
  }
}
