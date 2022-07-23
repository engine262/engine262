import { InstantiateOrdinaryFunctionExpression } from './all.mjs';

// #sec-function-definitions-runtime-semantics-evaluation
//   FunctionExpression :
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
export function Evaluate_FunctionExpression(FunctionExpression) {
  // 1. Return InstantiateOrdinaryFunctionExpression of FunctionExpression.
  return InstantiateOrdinaryFunctionExpression(FunctionExpression);
}
