import { InstantiateArrowFunctionExpression } from './all.mjs';

/** http://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-evaluation */
export function Evaluate_ArrowFunction(ArrowFunction) {
  // 1. Return InstantiateArrowFunctionExpression of ArrowFunction.
  return InstantiateArrowFunctionExpression(ArrowFunction);
}
