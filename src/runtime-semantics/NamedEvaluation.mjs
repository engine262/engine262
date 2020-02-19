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
import { X } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-function-definitions-runtime-semantics-namedevaluation
//   FunctionExpression :
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
function NamedEvaluation_FunctionExpression(FunctionExpression, name) {
  const { FormalParameters, FunctionBody } = FunctionExpression;
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let closure be OrdinaryFunctionCreate(%Function.prototype%, FormalParameters, FunctionBody, non-lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), FormalParameters, FunctionBody, 'non-lexical-this', scope);
  // 3. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 4. Perform MakeConstructor(closure).
  MakeConstructor(closure);
  // 5. Set closure.[[SourceText]] to the source text matched by FunctionExpression.
  closure.SourceText = sourceTextMatchedBy(FunctionExpression);
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
  // 2. Let closure be OrdinaryFunctionCreate(%Generator%, FormalParameters, GeneratorBody, non-lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Generator%'), FormalParameters, GeneratorBody, 'non-lexical-this', scope);
  // 3. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 4. Let prototype be OrdinaryObjectCreate(%Generator.prototype%).
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Generator.prototype%'));
  // 5. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));
  // 6. Set closure.[[SourceText]] to the source text matched by GeneratorExpression.
  closure.SourceText = sourceTextMatchedBy(GeneratorExpression);
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
  // 2. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, FormalParameters, AsyncFunctionBody, non-lexical-this, scope).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), FormalParameters, AsyncFunctionBody, 'non-lexical-this', scope));
  // 3. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 4. Set closure.[[SourceText]] to the source text matched by AsyncFunctionExpression.
  closure.SourceText = sourceTextMatchedBy(AsyncFunctionExpression);
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
  // 2. Let closure be OrdinaryFunctionCreate(%AsyncGeneratorFunction.prototype%, FormalParameters, GeneratorBody, non-lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), FormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope);
  // 3. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 4. Let prototype be OrdinaryObjectCreate(%AsyncGenerator.prototype%).
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGenerator.prototype%'));
  // 5. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));
  // 6. Set closure.[[SourceText]] to the source text matched by AsyncGeneratorExpression.
  closure.SourceText = sourceTextMatchedBy(AsyncGeneratorExpression);
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
  // 1. Let parameters be CoveredFormalsList of ArrowParameters.
  const parameters = ArrowParameters;
  // 1. Let closure be OrdinaryFunctionCreate(%Function.prototype%, parameters, ConciseBody, lexical-this, scope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), parameters, ConciseBody, 'lexical-this', scope);
  // 1. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 1. Set closure.[[SourceText]] to the source text matched by ArrowFunction.
  closure.SourceText = sourceTextMatchedBy(ArrowFunction);
  // 1. Return closure.
  return closure;
}

export function NamedEvaluation(F, name) {
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
    default:
      throw new OutOfRange('NamedEvaluation', F);
  }
}
