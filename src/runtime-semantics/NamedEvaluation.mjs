import { surroundingAgent } from '../engine.mjs';
import { Value, Descriptor } from '../value.mjs';
import {
  OrdinaryFunctionCreate,
  OrdinaryObjectCreate,
  SetFunctionName,
  MakeConstructor,
  DefinePropertyOrThrow,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { ReturnIfAbrupt, X } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { ClassDefinitionEvaluation } from './all.mjs';

// #sec-function-definitions-runtime-semantics-namedevaluation
//   FunctionExpression :
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
function NamedEvaluation_FunctionExpression(FunctionExpression, name) {
  const { FormalParameters, FunctionBody } = FunctionExpression;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let sourceText be the source text matched by FunctionExpression.
  const sourceText = sourceTextMatchedBy(FunctionExpression);
  // 3. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText, FormalParameters, FunctionBody, non-lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), sourceText, FormalParameters, FunctionBody, 'non-lexical-this', scope);
  // 4. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 5. Perform MakeConstructor(closure).
  MakeConstructor(closure);
  // 6. Return closure.
  return closure;
}


// #sec-generator-function-definitions-runtime-semantics-namedevaluation
//   GeneratorExpression :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
function NamedEvaluation_GeneratorExpression(GeneratorExpression, name) {
  const { FormalParameters, GeneratorBody } = GeneratorExpression;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let sourceText be the source text matched by GeneratorExpression.
  const sourceText = sourceTextMatchedBy(GeneratorExpression);
  // 3. Let closure be OrdinaryFunctionCreate(%Generator%, sourceText, FormalParameters, GeneratorBody, non-lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Generator%'), sourceText, FormalParameters, GeneratorBody, 'non-lexical-this', scope);
  // 4. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 5. Let prototype be OrdinaryObjectCreate(%Generator.prototype%).
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Generator.prototype%'));
  // 6. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));
  // 7. Return closure.
  return closure;
}

// #sec-async-function-definitions-runtime-semantics-namedevaluation
//   AsyncFunctionExpression :
//     `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
function NamedEvaluation_AsyncFunctionExpression(AsyncFunctionExpression, name) {
  const { FormalParameters, AsyncFunctionBody } = AsyncFunctionExpression;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let sourceText be the source text matched by AsyncFunctionExpression.
  const sourceText = sourceTextMatchedBy(AsyncFunctionExpression);
  // 3. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, FormalParameters, AsyncFunctionBody, non-lexical-this, scope).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, FormalParameters, AsyncFunctionBody, 'non-lexical-this', scope));
  // 4. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 5. Return closure.
  return closure;
}

// #sec-asyncgenerator-definitions-namedevaluation
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
function NamedEvaluation_AsyncGeneratorExpression(AsyncGeneratorExpression, name) {
  const { FormalParameters, AsyncGeneratorBody } = AsyncGeneratorExpression;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let sourceText be the source text matched by AsyncGeneratorExpression.
  const sourceText = sourceTextMatchedBy(AsyncGeneratorExpression);
  // 3. Let closure be OrdinaryFunctionCreate(%AsyncGeneratorFunction.prototype%, sourceText, FormalParameters, GeneratorBody, non-lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, FormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope);
  // 4. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 5. Let prototype be OrdinaryObjectCreate(%AsyncGenerator.prototype%).
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGenerator.prototype%'));
  // 6. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));
  // 7. Return closure.
  return closure;
}

// #sec-arrow-function-definitions-runtime-semantics-namedevaluation
//   ArrowFunction :
//     ArrowParameters `=>` ConciseBody
function NamedEvaluation_ArrowFunction(ArrowFunction, name) {
  const { ArrowParameters, ConciseBody } = ArrowFunction;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let sourceText be the source text matched by ArrowFunction.
  const sourceText = sourceTextMatchedBy(ArrowFunction);
  // 3. Let parameters be CoveredFormalsList of ArrowParameters.
  const parameters = ArrowParameters;
  // 4. Let closure be OrdinaryFunctionCreate(%Function.prototype%, parameters, ConciseBody, lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), sourceText, parameters, ConciseBody, 'lexical-this', scope);
  // 5. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 6. Return closure.
  return closure;
}

// #sec-arrow-function-definitions-runtime-semantics-namedevaluation
//   AsyncArrowFunction :
//     ArrowParameters `=>` AsyncConciseBody
function NamedEvaluation_AsyncArrowFunction(AsyncArrowFunction, name) {
  const { ArrowParameters, AsyncConciseBody } = AsyncArrowFunction;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let sourceText be the source text matched by ArrowFunction.
  const sourceText = sourceTextMatchedBy(AsyncArrowFunction);
  // 3. Let head be CoveredAsyncArrowHead of CoverCallExpressionAndAsyncArrowHead.
  // 4. Let parameters be the ArrowFormalParameters of head.
  const parameters = ArrowParameters;
  // 5. Let closure be OrdinaryFunctionCreate(%Function.prototype%, parameters, ConciseBody, lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, parameters, AsyncConciseBody, 'lexical-this', scope);
  // 6. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 7. Return closure.
  return closure;
}

// #sec-class-definitions-runtime-semantics-namedevaluation
//   ClassExpression : `class` ClassTail
function* NamedEvaluation_ClassExpression(ClassExpression, name) {
  const { ClassTail } = ClassExpression;
  // 1. Let value be the result of ClassDefinitionEvaluation of ClassTail with arguments undefined and name.
  const value = yield* ClassDefinitionEvaluation(ClassTail, Value.undefined, name);
  // 2. ReturnIfAbrupt(value).
  ReturnIfAbrupt(value);
  // 3. Set value.[[SourceText]] to the source text matched by ClassExpression.
  value.SourceText = sourceTextMatchedBy(ClassExpression);
  // 4. Return value.
  return value;
}

export function* NamedEvaluation(F, name) {
  switch (F.type) {
    case 'FunctionExpression':
      return NamedEvaluation_FunctionExpression(F, name);
    case 'GeneratorExpression':
      return NamedEvaluation_GeneratorExpression(F, name);
    case 'AsyncFunctionExpression':
      return NamedEvaluation_AsyncFunctionExpression(F, name);
    case 'AsyncGeneratorExpression':
      return NamedEvaluation_AsyncGeneratorExpression(F, name);
    case 'ArrowFunction':
      return NamedEvaluation_ArrowFunction(F, name);
    case 'AsyncArrowFunction':
      return NamedEvaluation_AsyncArrowFunction(F, name);
    case 'ClassExpression':
      return yield* NamedEvaluation_ClassExpression(F, name);
    default:
      throw new OutOfRange('NamedEvaluation', F);
  }
}
