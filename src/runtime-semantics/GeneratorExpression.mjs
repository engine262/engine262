import { InstantiateGeneratorFunctionExpression } from './all.mjs';

// #sec-generator-function-definitions-runtime-semantics-evaluation
//   GeneratorExpression :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
export function Evaluate_GeneratorExpression(GeneratorExpression) {
  // 1. Return InstantiateGeneratorFunctionExpression of GeneratorExpression.
  return InstantiateGeneratorFunctionExpression(GeneratorExpression);
}
