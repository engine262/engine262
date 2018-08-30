import {
  Evaluate_Expression,
} from '../evaluator.mjs';
import {
  GetValue,
} from '../abstract-ops/all.mjs';
import {
  Q,
  ThrowCompletion,
} from '../completion.mjs';

// ThrowStatement : throw Expression ;
export function Evaluate_ThrowStatement(Expression) {
  const exprRef = Evaluate_Expression(Expression);
  const exprValue = Q(GetValue(exprRef));
  return new ThrowCompletion(exprValue);
}
