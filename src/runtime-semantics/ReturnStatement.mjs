import { GetGeneratorKind } from '../engine.mjs';
import { New as NewValue } from '../value.mjs';
import {
  Q, X,
  ReturnCompletion,
  Await,
} from '../completion.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';

// #sec-return-statement-runtime-semantics-evaluation
export function Evaluate_ReturnStatement({ argument: Expression }) {
  if (Expression === null) {
    // ReturnStatement : return `;`
    return new ReturnCompletion(NewValue(undefined));
  } else {
    // ReturnStatement : return Expression `;`
    const exprRef = Evaluate_Expression(Expression);
    let exprValue = Q(GetValue(exprRef));
    if (X(GetGeneratorKind()) === 'async') {
      exprValue = Q(Await(exprValue));
    }
    return new ReturnCompletion(exprValue);
  }
}
