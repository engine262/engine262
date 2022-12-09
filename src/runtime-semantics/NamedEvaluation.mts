// @ts-nocheck
import { Value } from '../value.mjs';
import { sourceTextMatchedBy } from '../abstract-ops/all.mjs';
import { ReturnIfAbrupt } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  ClassDefinitionEvaluation,
  InstantiateOrdinaryFunctionExpression,
  InstantiateAsyncFunctionExpression,
  InstantiateGeneratorFunctionExpression,
  InstantiateAsyncGeneratorFunctionExpression,
  InstantiateArrowFunctionExpression,
  InstantiateAsyncArrowFunctionExpression,
} from './all.mjs';

/** http://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-namedevaluation */
//   FunctionExpression :
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
function NamedEvaluation_FunctionExpression(FunctionExpression, name) {
  return InstantiateOrdinaryFunctionExpression(FunctionExpression, name);
}

/** http://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-namedevaluation */
//   GeneratorExpression :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
function NamedEvaluation_GeneratorExpression(GeneratorExpression, name) {
  return InstantiateGeneratorFunctionExpression(GeneratorExpression, name);
}

/** http://tc39.es/ecma262/#sec-async-function-definitions-runtime-semantics-namedevaluation */
//   AsyncFunctionExpression :
//     `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
function NamedEvaluation_AsyncFunctionExpression(AsyncFunctionExpression, name) {
  return InstantiateAsyncFunctionExpression(AsyncFunctionExpression, name);
}

/** http://tc39.es/ecma262/#sec-asyncgenerator-definitions-namedevaluation */
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
function NamedEvaluation_AsyncGeneratorExpression(AsyncGeneratorExpression, name) {
  return InstantiateAsyncGeneratorFunctionExpression(AsyncGeneratorExpression, name);
}

/** http://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-namedevaluation */
//   ArrowFunction :
//     ArrowParameters `=>` ConciseBody
function NamedEvaluation_ArrowFunction(ArrowFunction, name) {
  return InstantiateArrowFunctionExpression(ArrowFunction, name);
}

/** http://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-namedevaluation */
//   AsyncArrowFunction :
//     ArrowParameters `=>` AsyncConciseBody
function NamedEvaluation_AsyncArrowFunction(AsyncArrowFunction, name) {
  return InstantiateAsyncArrowFunctionExpression(AsyncArrowFunction, name);
}

/** http://tc39.es/ecma262/#sec-class-definitions-runtime-semantics-namedevaluation */
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
    case 'ParenthesizedExpression':
      return yield* NamedEvaluation(F.Expression, name);
    default:
      throw new OutOfRange('NamedEvaluation', F);
  }
}
