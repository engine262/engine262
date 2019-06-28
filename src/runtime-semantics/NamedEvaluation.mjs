import {
  Assert,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
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
import { X } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { IsAnonymousFunctionDefinition } from '../static-semantics/all.mjs';
import { Value } from '../value.mjs';
import {
  ClassDefinitionEvaluation_ClassTail,
  Evaluate_ArrowFunction,
  Evaluate_AsyncArrowFunction,
  Evaluate_AsyncFunctionExpression,
  Evaluate_AsyncGeneratorExpression,
  Evaluate_FunctionExpression,
  Evaluate_GeneratorExpression,
} from './all.mjs';

// #sec-grouping-operator-runtime-semantics-namedevaluation
//   ParenthesizedExpression : `(` Expression `)`
function* NamedEvaluation_ParenthesizedExpression(ParenthesizedExpression, name) {
  const { expression: Expression } = ParenthesizedExpression;
  Assert(IsAnonymousFunctionDefinition(Expression));
  return yield* NamedEvaluation_Expression(Expression, name);
}

// #sec-function-definitions-runtime-semantics-namedevaluation
//   FunctionExpression : `function` `(` FormalParameters `)` `{` FunctionBody `}`
function NamedEvaluation_FunctionExpression(FunctionExpression, name) {
  const closure = Evaluate_FunctionExpression(FunctionExpression);
  X(SetFunctionName(closure, name));
  return closure;
}

// #sec-arrow-function-definitions-runtime-semantics-namedevaluation
//   ArrowFunction : ArrowParameters `=>` ConciseBody
function NamedEvaluation_ArrowFunction(ArrowFunction, name) {
  const closure = Evaluate_ArrowFunction(ArrowFunction);
  X(SetFunctionName(closure, name));
  return closure;
}

// #sec-generator-function-definitions-runtime-semantics-namedevaluation
//   GeneratorExpression : `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
function NamedEvaluation_GeneratorExpression(GeneratorExpression, name) {
  const closure = Evaluate_GeneratorExpression(GeneratorExpression);
  X(SetFunctionName(closure, name));
  return closure;
}

// #sec-asyncgenerator-definitions-namedevaluation
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
function NamedEvaluation_AsyncGeneratorExpression(AsyncGeneratorExpression, name) {
  const closure = Evaluate_AsyncGeneratorExpression(AsyncGeneratorExpression);
  X(SetFunctionName(closure, name));
  return closure;
}

// #sec-class-definitions-runtime-semantics-namedevaluation
//   ClassExpression : `class` ClassTail
function* NamedEvaluation_ClassExpression(ClassExpression, name) {
  const { body, superClass } = ClassExpression;
  const ClassTail = {
    ClassHeritage: superClass,
    ClassBody: body.body,
  };
  return yield* ClassDefinitionEvaluation_ClassTail(ClassTail, Value.undefined, name);
}

// #sec-async-function-definitions-runtime-semantics-namedevaluation
//   AsyncFunctionExpression :
//     `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
function NamedEvaluation_AsyncFunctionExpression(AsyncFunctionExpression, name) {
  const closure = Evaluate_AsyncFunctionExpression(AsyncFunctionExpression);
  X(SetFunctionName(closure, name));
  return closure;
}

// #sec-async-arrow-function-definitions-runtime-semantics-namedevaluation
//   AsyncArrowFunction :
//     `async` AsyncArrowBindingIdentifier `=>` AsyncConciseBody
//     CoverCallExpressionAndAsyncArrowHead `=>` AsyncConciseBody
function NamedEvaluation_AsyncArrowFunction(AsyncArrowFunction, name) {
  const closure = Evaluate_AsyncArrowFunction(AsyncArrowFunction);
  X(SetFunctionName(closure, name));
  return closure;
}

// (implicit)
export function* NamedEvaluation_Expression(Expression, name) {
  switch (true) {
    case isFunctionExpression(Expression):
      return NamedEvaluation_FunctionExpression(Expression, name);

    case isClassExpression(Expression):
      return yield* NamedEvaluation_ClassExpression(Expression, name);

    case isGeneratorExpression(Expression):
      return NamedEvaluation_GeneratorExpression(Expression, name);

    case isAsyncFunctionExpression(Expression):
      return NamedEvaluation_AsyncFunctionExpression(Expression, name);

    case isAsyncGeneratorExpression(Expression):
      return NamedEvaluation_AsyncGeneratorExpression(Expression, name);

    case isArrowFunction(Expression):
      return NamedEvaluation_ArrowFunction(Expression, name);

    case isAsyncArrowFunction(Expression):
      return NamedEvaluation_AsyncArrowFunction(Expression, name);

    case isParenthesizedExpression(Expression):
      return yield* NamedEvaluation_ParenthesizedExpression(Expression, name);

    default:
      throw new OutOfRange('NamedEvaluation_Expression', Expression);
  }
}
