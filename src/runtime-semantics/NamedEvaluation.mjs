import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  SetFunctionName,
  OrdinaryFunctionCreate,
  OrdinaryObjectCreate,
  MakeConstructor,
  sourceTextMatchedBy,
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
import { X, ReturnIfAbrupt } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { IsAnonymousFunctionDefinition } from '../static-semantics/all.mjs';
import { Value, Descriptor } from '../value.mjs';
import { ClassDefinitionEvaluation_ClassTail } from './all.mjs';

// 12.2.10.4 #sec-grouping-operator-runtime-semantics-namedevaluation
//   ParenthesizedExpression : `(` Expression `)`
function* NamedEvaluation_ParenthesizedExpression(ParenthesizedExpression, name) {
  const { expression: Expression } = ParenthesizedExpression;
  Assert(IsAnonymousFunctionDefinition(Expression));
  return yield* NamedEvaluation_Expression(Expression, name);
}

// 14.1.21 #sec-function-definitions-runtime-semantics-namedevaluation
//   FunctionExpression : `function` `(` FormalParameters `)` `{` FunctionBody `}`
export function NamedEvaluation_FunctionExpression(FunctionExpression, name) {
  const { params: FormalParameters } = FunctionExpression;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let closure be OrdinaryFunctionCreate(%Function.prototype%, FormalParameters, FunctionBody, lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), FormalParameters, FunctionExpression, 'non-lexical-this', scope);
  // 3. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 4. Perform MakeConstructor(closure).
  MakeConstructor(closure);
  // 5. Set closure.[[SourceText]] to the source text matched by FunctionExpression.
  closure.SourceText = sourceTextMatchedBy(FunctionExpression);
  // 6. Return closure.
  return closure;
}

// 14.2.16 #sec-arrow-function-definitions-runtime-semantics-namedevaluation
//   ArrowFunction : ArrowParameters `=>` ConciseBody
export function NamedEvaluation_ArrowFunction(ArrowFunction, name) {
  const { params: ArrowParameters } = ArrowFunction;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let parameters be CoveredFormalsList of ArrowParameters.
  const parameters = ArrowParameters;
  // 3. Let closure be OrdinaryFunctionCreate(%Function.prototype%, parameters, ConciseBody, lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), parameters, ArrowFunction, 'lexical-this', scope);
  // 4. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 5. Set closure.[[SourceText]] to the source text matched by ArrowFunction.
  closure.SourceText = sourceTextMatchedBy(ArrowFunction);
  // 6. Return closure.
  return closure;
}

// 14.4.13 #sec-generator-function-definitions-runtime-semantics-namedevaluation
//   GeneratorExpression : `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
export function NamedEvaluation_GeneratorExpression(GeneratorExpression, name) {
  const { params: FormalParameters } = GeneratorExpression;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let closure be ! OrdinaryFunctionCreate(%Generator%, FormalParameters, GeneratorBody, non-lexical-this, scope).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Generator%'), FormalParameters, GeneratorExpression, 'non-lexical-this', scope));
  // 3. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 4. Let prototype be ! OrdinaryObjectCreate(%Generator.prototype%).
  const prototype = X(OrdinaryObjectCreate(surroundingAgent.intrinsic('%Generator.prototype%')));
  // 5. Perform ! DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  X(DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  // 6. Set closure.[[SourceText]] to the source text matched by GeneratorExpression.
  closure.SourceText = sourceTextMatchedBy(GeneratorExpression);
  // 7. Return closure.
  return closure;
}

// 14.5.13 #sec-asyncgenerator-definitions-namedevaluation
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
export function NamedEvaluation_AsyncGeneratorExpression(AsyncGeneratorExpression, name) {
  const { params: FormalParameters } = AsyncGeneratorExpression;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let closure be ! OrdinaryFunctionCreate(%AsyncGenerator%, FormalParameters, AsyncGeneratorBody, non-lexical-this, scope).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), FormalParameters, AsyncGeneratorExpression, 'non-lexical-this', scope));
  // 3. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 4. Let prototype be ! OrdinaryObjectCreate(%AsyncGenerator.prototype%).
  const prototype = X(OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGenerator.prototype%')));
  // 5. Perform ! DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  X(DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  // 6. Set closure.[[SourceText]] to the source text matched by AsyncGeneratorExpression.
  closure.SourceText = sourceTextMatchedBy(AsyncGeneratorExpression);
  // 7. Return closure.
  return closure;
}

// 14.6.15 #sec-class-definitions-runtime-semantics-namedevaluation
//   ClassExpression : `class` ClassTail
function* NamedEvaluation_ClassExpression(ClassExpression, name) {
  const { body, superClass } = ClassExpression;
  const ClassTail = {
    ClassHeritage: superClass,
    ClassBody: body.body,
  };
  const value = yield* ClassDefinitionEvaluation_ClassTail(ClassTail, Value.undefined, name);
  ReturnIfAbrupt(value);
  value.SourceText = sourceTextMatchedBy(ClassExpression);
  return value;
}

// 14.7.13 #sec-async-function-definitions-runtime-semantics-namedevaluation
//   AsyncFunctionExpression :
//     `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
export function NamedEvaluation_AsyncFunctionExpression(AsyncFunctionExpression, name) {
  const { params: FormalParameters } = AsyncFunctionExpression;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, FormalParameters, AsyncFunctionBody, non-lexical-this, scope).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), FormalParameters, AsyncFunctionExpression, 'non-lexical-this', scope));
  // 3. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 4. Set closure.[[SourceText]] to the source text matched by AsyncFunctionExpression.
  closure.SourceText = sourceTextMatchedBy(AsyncFunctionExpression);
  // 5. Return closure.
  return closure;
}

// 14.8.15 #sec-async-arrow-function-definitions-runtime-semantics-namedevaluation
//   AsyncArrowFunction :
//     `async` AsyncArrowBindingIdentifier `=>` AsyncConciseBody
//     CoverCallExpressionAndAsyncArrowHead `=>` AsyncConciseBody
export function NamedEvaluation_AsyncArrowFunction(AsyncArrowFunction, name) {
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let parameters be AsyncArrowBindingIdentifier.
  const parameters = AsyncArrowFunction.params;
  // 3. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, parameters, AsyncConciseBody, lexical-this, scope).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), parameters, AsyncArrowFunction, 'lexical-this', scope));
  // 4. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 5. Set closure.[[SourceText]] to the source text matched by AsyncArrowFunction.
  closure.SourceText = sourceTextMatchedBy(AsyncArrowFunction);
  // 6. Return closure.
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
