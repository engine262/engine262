import {
  Evaluate_Expression,
  Evaluate_Statement,
} from '../evaluator.mjs';
import {
  GetValue,
  ToBoolean,
} from '../abstract-ops/all.mjs';
import {
  Q,
  Completion,
  NormalCompletion,
  UpdateEmpty,
} from '../completion.mjs';
import { New as NewValue } from '../value.mjs';

export function Evaluate_IfStatement({
  test: Expression,
  consequent: Statement,
  alternate: AlternateStatement,
}) {
  const exprRef = Evaluate_Expression(Expression);
  const exprValue = ToBoolean(Q(GetValue(exprRef)));

  if (AlternateStatement !== null) {
    // IfStatement : `if` `(` Expression `)` Statement `else` Statement
    let stmtCompletion;
    if (exprValue.isTrue()) {
      stmtCompletion = Evaluate_Statement(Statement);
    } else {
      stmtCompletion = Evaluate_Statement(AlternateStatement);
    }
    return new Completion(UpdateEmpty(stmtCompletion, NewValue(undefined)));
  } else {
    // IfStatement : `if` `(` Expression `)` Statement
    if (exprValue.isFalse()) {
      return new NormalCompletion(undefined);
    } else {
      const stmtCompletion = Evaluate_Statement(Statement);
      return new Completion(UpdateEmpty(stmtCompletion, NewValue(undefined)));
    }
  }
}
