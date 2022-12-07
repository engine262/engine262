import { InstantiateAsyncArrowFunctionExpression } from './all.mjs';

/** http://tc39.es/ecma262/#sec-async-arrow-function-definitions-runtime-semantics-evaluation  */
export function Evaluate_AsyncArrowFunction(AsyncArrowFunction) {
  // 1. Return InstantiateAsyncArrowFunctionExpression of AsyncArrowFunction.
  return InstantiateAsyncArrowFunctionExpression(AsyncArrowFunction);
}
