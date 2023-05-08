// @ts-nocheck
import { InstantiateGeneratorFunctionExpression } from './all.mjs';

/** https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-evaluation */
//   GeneratorExpression :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
export function Evaluate_GeneratorExpression(GeneratorExpression) {
  // 1. Return InstantiateGeneratorFunctionExpression of GeneratorExpression.
  return InstantiateGeneratorFunctionExpression(GeneratorExpression);
}
