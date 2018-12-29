import {
  isArrowFunction,
  isAsyncArrowFunction,
  isAsyncFunctionExpression,
  isAsyncGeneratorExpression,
  isClassExpression,
  isFunctionExpression,
  isGeneratorExpression,
  isParenthesizedExpression,
} from '../ast.mjs';

// At the time of implementation, only the following productions return true
// for this static semantic:
//
// 12.15.2 #sec-assignment-operators-static-semantics-isfunctiondefinition
//   AssignmentExpression :
//     ArrowFunction
//     AsyncArrowFunction
//
// 14.1.12 #sec-function-definitions-static-semantics-isfunctiondefinition
//   FunctionExpression :
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
//
// 14.4.8 #sec-generator-function-definitions-static-semantics-isfunctiondefinition
//   GeneratorExpression :
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
//
// 14.5.8 #sec-async-generator-function-definitions-static-semantics-isfunctiondefinition
//   AsyncGeneratorExpression :
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//
// 14.6.8 #sec-class-definitions-static-semantics-isfunctiondefinition
//   ClassExpression : `class` BindingIdentifier_opt ClassTail
//
// 14.7.8 #sec-async-function-definitions-static-semantics-IsFunctionDefinition
//   AsyncFunctionExpression :
//     `async` [no LineTerminator here] `function` `(` FormalParameters `)`
//       `{` AsyncFunctionBody `}`
//     `async` [no LineTerminator here] `function` BindingIdentifier `(` FormalParameters `)`
//       `{` AsyncFunctionBody `}`
//
// All other explicit and implicit productions return false, including those
// specified at the following anchors:
//
// 12.2.1.3 #sec-semantics-static-semantics-isfunctiondefinition
// 12.2.10.2 #sec-grouping-operator-static-semantics-isfunctiondefinition
// 12.3.1.3 #sec-static-semantics-static-semantics-isfunctiondefinition
// 12.4.2 #sec-update-expressions-static-semantics-isfunctiondefinition
// 12.5.1 #sec-unary-operators-static-semantics-isfunctiondefinition
// 12.6.1 #sec-exp-operator-static-semantics-isfunctiondefinition
// 12.7.1 #sec-multiplicative-operators-static-semantics-isfunctiondefinition
// 12.8.1 #sec-additive-operators-static-semantics-isfunctiondefinition
// 12.9.1 #sec-bitwise-shift-operators-static-semantics-isfunctiondefinition
// 12.10.1 #sec-relational-operators-static-semantics-isfunctiondefinition
// 12.11.1 #sec-equality-operators-static-semantics-isfunctiondefinition
// 12.12.1 #sec-binary-bitwise-operators-static-semantics-isfunctiondefinition
// 12.13.1 #sec-binary-logical-operators-static-semantics-isfunctiondefinition
// 12.14.1 #sec-conditional-operator-static-semantics-isfunctiondefinition
// 12.15.2 #sec-assignment-operators-static-semantics-isfunctiondefinition
// 12.16.1 #sec-comma-operator-static-semantics-isfunctiondefinition
export function IsFunctionDefinition_Expression(Expression) {
  if (isParenthesizedExpression(Expression)) {
    return IsFunctionDefinition_Expression(Expression.expression);
  }
  return isArrowFunction(Expression)
         || isAsyncArrowFunction(Expression)
         || isFunctionExpression(Expression)
         || isGeneratorExpression(Expression)
         || isAsyncGeneratorExpression(Expression)
         || isClassExpression(Expression)
         || isAsyncFunctionExpression(Expression);
}
