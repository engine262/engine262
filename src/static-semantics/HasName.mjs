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
import { IsFunctionDefinition_Expression } from './all.mjs';
import { OutOfRange } from '../helpers.mjs';

// 12.2.1.2 #sec-semantics-static-semantics-hasname
//   PrimaryExpression : CoverParenthesizedExpressionAndArrowParameterList
//
// 14.1.9 #sec-function-definitions-static-semantics-hasname
//   FunctionExpression :
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
//
// 14.2.7 #sec-arrow-function-definitions-static-semantics-hasname
//   ArrowFunction : ArrowParameters `=>` ConciseBody
//
// 14.4.6 #sec-generator-function-definitions-static-semantics-hasname
//   GeneratorExpression :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
//
// 14.5.6 #sec-async-generator-function-definitions-static-semantics-hasname
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//
// 14.6.6 #sec-class-definitions-static-semantics-hasname
//   ClassExpression :
//     `class` ClassTail
//     `class` BindingIdentifier ClassTail
//
// 14.7.6 #sec-async-function-definitions-static-semantics-HasName
//   AsyncFunctionExpression :
//     `async` [no LineTerminator here] `function` `(` FormalParameters `)`
//       `{` AsyncFunctionBody `}`
//     `async` [no LineTerminator here] `function` BindingIdentifier `(` FormalParameters `)`
//       `{` AsyncFunctionBody `}`
//
// 14.8.7 #sec-async-arrow-function-definitions-static-semantics-HasName
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

    case isParenthesizedExpression(Expression):
      return HasName_Expression(Expression.expression);

    default:
      throw new OutOfRange('HasName_Expression', Expression);
  }
}
