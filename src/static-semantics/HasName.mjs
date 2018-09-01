import {
  isArrowFunction,
  isAsyncArrowFunction,
  isAsyncFunctionExpression,
  isAsyncGeneratorExpression,
  isClassExpression,
  isFunctionExpression,
  isGeneratorExpression,
} from '../ast.mjs';
import { IsFunctionDefinition_Expression } from './all.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-semantics-static-semantics-hasname
//   PrimaryExpression : CoverParenthesizedExpressionAndArrowParameterList
//
// #sec-function-definitions-static-semantics-hasname
//   FunctionExpression :
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
//
// #sec-arrow-function-definitions-static-semantics-hasname
//   ArrowFunction : ArrowParameters `=>` ConciseBody
//
// #sec-generator-function-definitions-static-semantics-hasname
//   GeneratorExpression :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
//
// #sec-async-generator-function-definitions-static-semantics-hasname
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//
// #sec-class-definitions-static-semantics-hasname
//   ClassExpression :
//     `class` ClassTail
//     `class` BindingIdentifier ClassTail
//
// #sec-async-function-definitions-static-semantics-HasName
//   AsyncFunctionExpression :
//     `async` [no LineTerminator here] `function` `(` FormalParameters `)`
//       `{` AsyncFunctionBody `}`
//     `async` [no LineTerminator here] `function` BindingIdentifier `(` FormalParameters `)`
//       `{` AsyncFunctionBody `}`
//
// #sec-async-arrow-function-definitions-static-semantics-HasName
//   AsyncArrowFunction:
//     `async` [no LineTerminator here] AsyncArrowBindingIdentifier [no LineTerminator here]
//       `=>` AsyncConciseBody
//     CoverCallExpressionAndAsyncArrowHead [no LineTerminator here] `=>` AsyncConciseBody
export function HasName_Expression(Expression) {
  if (!IsFunctionDefinition_Expression(Expression)) {
    return false;
  }

  switch (true) {
    case isFunctionExpression(Expression):
    case isGeneratorExpression(Expression):
    case isAsyncGeneratorExpression(Expression):
    case isClassExpression(Expression):
    case isAsyncFunctionExpression(Expression):
      return Expression.id !== null;

    case isArrowFunction(Expression):
    case isAsyncArrowFunction(Expression):
      return false;

    default:
      throw outOfRange('HasName_Expression', Expression);
  }
}
