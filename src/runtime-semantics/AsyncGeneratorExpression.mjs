import { InstantiateAsyncGeneratorFunctionExpression } from './all.mjs';

// #sec-asyncgenerator-definitions-evaluation
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
export function Evaluate_AsyncGeneratorExpression(AsyncGeneratorExpression) {
  // 1. Return InstantiateAsyncGeneratorFunctionExpression of AsyncGeneratorExpression.
  return InstantiateAsyncGeneratorFunctionExpression(AsyncGeneratorExpression);
}
