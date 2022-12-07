import { Evaluate } from '../evaluator.mjs';

/** http://tc39.es/ecma262/#sec-grouping-operator-runtime-semantics-evaluation  */
export function* Evaluate_ParenthesizedExpression({ Expression }) {
  // 1. Return the result of evaluating Expression. This may be of type Reference.
  return yield* Evaluate(Expression);
}
