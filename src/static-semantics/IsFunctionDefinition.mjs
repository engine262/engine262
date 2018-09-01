import {
  isArrowFunction,
  isAsyncArrowFunction,
  isAsyncFunctionExpression,
  isAsyncGeneratorExpression,
  isClassExpression,
  isFunctionExpression,
  isGeneratorExpression,
} from '../ast.mjs';

// At the time of implementation, only the following productions return true
// for this static semantic:
//
// #sec-assignment-operators-static-semantics-isfunctiondefinition
//   AssignmentExpression :
//     ArrowFunction
//     AsyncArrowFunction
//
// #sec-function-definitions-static-semantics-isfunctiondefinition
//   FunctionExpression :
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
//
// #sec-generator-function-definitions-static-semantics-isfunctiondefinition
//   GeneratorExpression :
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
//
// #sec-async-generator-function-definitions-static-semantics-isfunctiondefinition
//   AsyncGeneratorExpression :
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//
// #sec-class-definitions-static-semantics-isfunctiondefinition
//   ClassExpression : `class` BindingIdentifier_opt ClassTail
//
// #sec-async-function-definitions-static-semantics-IsFunctionDefinition
//   AsyncFunctionExpression :
//     `async` [no LineTerminator here] `function` `(` FormalParameters `)`
//       `{` AsyncFunctionBody `}`
//     `async` [no LineTerminator here] `function` BindingIdentifier `(` FormalParameters `)`
//       `{` AsyncFunctionBody `}`
//
// All other explicit and implicit productions return false, including those
// specified at the following anchors:
//
// #sec-semantics-static-semantics-isfunctiondefinition
// #sec-grouping-operator-static-semantics-isfunctiondefinition
// #sec-static-semantics-static-semantics-isfunctiondefinition
// #sec-update-expressions-static-semantics-isfunctiondefinition
// #sec-unary-operators-static-semantics-isfunctiondefinition
// #sec-exp-operator-static-semantics-isfunctiondefinition
// #sec-multiplicative-operators-static-semantics-isfunctiondefinition
// #sec-additive-operators-static-semantics-isfunctiondefinition
// #sec-bitwise-shift-operators-static-semantics-isfunctiondefinition
// #sec-relational-operators-static-semantics-isfunctiondefinition
// #sec-equality-operators-static-semantics-isfunctiondefinition
// #sec-binary-bitwise-operators-static-semantics-isfunctiondefinition
// #sec-binary-logical-operators-static-semantics-isfunctiondefinition
// #sec-conditional-operator-static-semantics-isfunctiondefinition
// #sec-assignment-operators-static-semantics-isfunctiondefinition
// #sec-comma-operator-static-semantics-isfunctiondefinition
export function IsFunctionDefinition_Expression(Expression) {
  return isArrowFunction(Expression)
         || isAsyncArrowFunction(Expression)
         || isFunctionExpression(Expression)
         || isGeneratorExpression(Expression)
         || isAsyncGeneratorExpression(Expression)
         || isClassExpression(Expression)
         || isAsyncFunctionExpression(Expression);
}
