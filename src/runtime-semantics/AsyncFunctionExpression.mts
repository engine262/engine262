// @ts-nocheck
import { InstantiateAsyncFunctionExpression } from './all.mjs';

/** https://tc39.es/ecma262/#sec-async-function-definitions-runtime-semantics-evaluation */
//   AsyncFunctionExpression :
//     `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
//     `async` `function` BindingIdentifier `(` FormalParameters `)` `{` AsyncFunctionBody `}`
export function Evaluate_AsyncFunctionExpression(AsyncFunctionExpression) {
  // 1. Return InstantiateAsyncFunctionExpression of AsyncFunctionExpression.
  return InstantiateAsyncFunctionExpression(AsyncFunctionExpression);
}
