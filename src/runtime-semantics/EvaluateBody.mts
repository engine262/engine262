// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import {
  Assert,
  AsyncFunctionStart,
  Call,
  GeneratorStart,
  NewPromiseCapability,
  OrdinaryCreateFromConstructor,
  AsyncGeneratorStart,
  GetValue,
} from '../abstract-ops/all.mjs';
import {
  Completion,
  AbruptCompletion,
  Q, X,
} from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { IsAnonymousFunctionDefinition } from '../static-semantics/all.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';
import {
  Evaluate_FunctionStatementList,
  FunctionDeclarationInstantiation,
  NamedEvaluation,
} from './all.mjs';

export function Evaluate_AnyFunctionBody({ FunctionStatementList }: ParseNode.FunctionBody) {
  return Evaluate_FunctionStatementList(FunctionStatementList);
}

/** https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluatebody */
// FunctionBody : FunctionStatementList
export function* EvaluateBody_FunctionBody({ FunctionStatementList }: ParseNode.FunctionBody, functionObject, argumentsList) {
  // 1. Perform ? FunctionDeclarationInstantiation(functionObject, argumentsList).
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  // 2. Return the result of evaluating FunctionStatementList.
  return yield* Evaluate_FunctionStatementList(FunctionStatementList);
}

/** https://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-evaluation */
// ExpressionBody : AssignmentExpression
export function* Evaluate_ExpressionBody({ AssignmentExpression }: ParseNode.ExpressionBody) {
  // 1. Let exprRef be the result of evaluating AssignmentExpression.
  const exprRef = yield* Evaluate(AssignmentExpression);
  // 2. Let exprValue be ? GetValue(exprRef).
  const exprValue = Q(GetValue(exprRef));
  // 3. Return Completion { [[Type]]: return, [[Value]]: exprValue, [[Target]]: empty }.
  return new Completion({ Type: 'return', Value: exprValue, Target: undefined });
}

/** https://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-evaluatebody */
// ConciseBody : ExpressionBody
export function* EvaluateBody_ConciseBody({ ExpressionBody }: ParseNode.ConciseBody, functionObject, argumentsList) {
  // 1. Perform ? FunctionDeclarationInstantiation(functionObject, argumentsList).
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  // 2. Return the result of evaluating ExpressionBody.
  return yield* Evaluate(ExpressionBody);
}

/** https://tc39.es/ecma262/#sec-async-arrow-function-definitions-EvaluateBody */
// AsyncConciseBody : ExpressionBody
function* EvaluateBody_AsyncConciseBody({ ExpressionBody }: ParseNode.AsyncConciseBody, functionObject, argumentsList) {
  // 1. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 2. Let declResult be FunctionDeclarationInstantiation(functionObject, argumentsList).
  const declResult = yield* FunctionDeclarationInstantiation(functionObject, argumentsList);
  // 3. If declResult is not an abrupt completion, then
  if (!(declResult instanceof AbruptCompletion)) {
    // a. Perform ! AsyncFunctionStart(promiseCapability, ExpressionBody).
    X(AsyncFunctionStart(promiseCapability, ExpressionBody));
  } else { // 4. Else
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « declResult.[[Value]] »).
    X(Call(promiseCapability.Reject, Value.undefined, [declResult.Value]));
  }
  // 5. Return Completion { [[Type]]: return, [[Value]]: promiseCapability.[[Promise]], [[Target]]: empty }.
  return new Completion({ Type: 'return', Value: promiseCapability.Promise, Target: undefined });
}

/** https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-evaluatebody */
// GeneratorBody : FunctionBody
export function* EvaluateBody_GeneratorBody(GeneratorBody: ParseNode.GeneratorBody, functionObject, argumentsList) {
  // 1. Perform ? FunctionDeclarationInstantiation(functionObject, argumentsList).
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  // 2. Let G be ? OrdinaryCreateFromConstructor(functionObject, "%GeneratorFunction.prototype.prototype%", « [[GeneratorState]], [[GeneratorContext]], [[GeneratorAsyncContextMapping]], [[GeneratorBrand]] »).
  const G = Q(OrdinaryCreateFromConstructor(functionObject, '%GeneratorFunction.prototype.prototype%', ['GeneratorState', 'GeneratorContext', 'GeneratorAsyncContextMapping', 'GeneratorBrand']));
  // 3. Set G.[[GeneratorBrand]] to empty.
  G.GeneratorBrand = undefined;
  // 4. Perform GeneratorStart(G, FunctionBody).
  GeneratorStart(G, GeneratorBody);
  // 5. Return Completion { [[Type]]: return, [[Value]]: G, [[Target]]: empty }.
  return new Completion({ Type: 'return', Value: G, Target: undefined });
}

/** https://tc39.es/ecma262/#sec-asyncgenerator-definitions-evaluatebody */
// AsyncGeneratorBody : FunctionBody
export function* EvaluateBody_AsyncGeneratorBody(FunctionBody: ParseNode.AsyncGeneratorBody, functionObject, argumentsList) {
  // 1. Perform ? FunctionDeclarationInstantiation(functionObject, argumentsList).
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  // 2. Let generator be ? OrdinaryCreateFromConstructor(functionObject, "%AsyncGeneratorFunction.prototype.prototype%", « [[AsyncGeneratorState]], [[AsyncGeneratorContext]], [[AsyncGeneratorQueue]], [[AsyncGeneratorAsyncContextMapping]], [[GeneratorBrand]] »).
  const generator = Q(OrdinaryCreateFromConstructor(functionObject, '%AsyncGeneratorFunction.prototype.prototype%', [
    'AsyncGeneratorState',
    'AsyncGeneratorContext',
    'AsyncGeneratorQueue',
    'AsyncGeneratorAsyncContextMapping',
    'GeneratorBrand',
  ]));
  // 3. Set generator.[[GeneratorBrand]] to empty.
  generator.GeneratorBrand = undefined;
  // 4. Perform ! AsyncGeneratorStart(generator, FunctionBody).
  X(AsyncGeneratorStart(generator, FunctionBody));
  // 5. Return Completion { [[Type]]: return, [[Value]]: generator, [[Target]]: empty }.
  return new Completion({ Type: 'return', Value: generator, Target: undefined });
}

/** https://tc39.es/ecma262/#sec-async-function-definitions-EvaluateBody */
// AsyncBody : FunctionBody
export function* EvaluateBody_AsyncFunctionBody(FunctionBody: ParseNode.AsyncBody, functionObject, argumentsList) {
  // 1. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 2. Let declResult be FunctionDeclarationInstantiation(functionObject, argumentsList).
  const declResult = yield* FunctionDeclarationInstantiation(functionObject, argumentsList);
  // 3. If declResult is not an abrupt completion, then
  if (!(declResult instanceof AbruptCompletion)) {
    // a. Perform ! AsyncFunctionStart(promiseCapability, FunctionBody).
    X(AsyncFunctionStart(promiseCapability, FunctionBody));
  } else { // 4. Else,
    // a. Perform ! Call(promiseCapability.[[Reject]], undefined, « declResult.[[Value]] »).
    X(Call(promiseCapability.Reject, Value.undefined, [declResult.Value]));
  }
  // 5. Return Completion { [[Type]]: return, [[Value]]: promiseCapability.[[Promise]], [[Target]]: empty }.
  return new Completion({ Type: 'return', Value: promiseCapability.Promise, Target: undefined });
}

// Initializer :
//   `=` AssignmentExpression
export function* EvaluateBody_AssignmentExpression(AssignmentExpression: ParseNode.AssignmentExpression, functionObject, argumentsList) {
  // 1. Assert: argumentsList is empty.
  Assert(argumentsList.length === 0);
  // 2. Assert: functionObject.[[ClassFieldInitializerName]] is not empty.
  Assert(functionObject.ClassFieldInitializerName !== undefined);
  let value;
  // 3. If IsAnonymousFunctionDefinition(AssignmentExpression) is true, then
  if (IsAnonymousFunctionDefinition(AssignmentExpression)) {
    // a. Let value be NamedEvaluation of Initializer with argument functionObject.[[ClassFieldInitializerName]].
    value = yield* NamedEvaluation(AssignmentExpression, functionObject.ClassFieldInitializerName);
  } else { // 4. Else,
    // a. Let rhs be the result of evaluating AssignmentExpression.
    const rhs = yield* Evaluate(AssignmentExpression);
    // b. Let value be ? GetValue(rhs).
    value = Q(GetValue(rhs));
  }
  // 5. Return Completion { [[Type]]: return, [[Value]]: value, [[Target]]: empty }.
  return new Completion({ Type: 'return', Value: value, Target: undefined });
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-evaluateclassstaticblockbody */
//    ClassStaticBlockBody : ClassStaticBlockStatementList
function* EvaluateClassStaticBlockBody({ ClassStaticBlockStatementList }: ParseNode.ClassStaticBlockBody, functionObject) {
  // 1. Perform ? FunctionDeclarationInstantiation(functionObject, « »).
  Q(yield* FunctionDeclarationInstantiation(functionObject, []));
  // 2. Return the result of evaluating ClassStaticBlockStatementList.
  return yield* Evaluate_FunctionStatementList(ClassStaticBlockStatementList);
}

// FunctionBody : FunctionStatementList
// ConciseBody : ExpressionBody
// GeneratorBody : FunctionBody
// AsyncGeneratorBody : FunctionBody
// AsyncBody : FunctionBody
// AsyncConciseBody : ExpressionBody
// ClassStaticBlockBody : ClassStaticBlockStatementList
export function EvaluateBody(Body: ParseNode.FunctionBodyLike | ParseNode.ConciseBodyLike | ParseNode.AsyncConciseBodyLike | ParseNode.ClassStaticBlockBody | ParseNode.AssignmentExpression, functionObject, argumentsList) {
  switch (Body.type) {
    case 'FunctionBody':
      return EvaluateBody_FunctionBody(Body, functionObject, argumentsList);
    case 'ConciseBody':
      return EvaluateBody_ConciseBody(Body, functionObject, argumentsList);
    case 'GeneratorBody':
      return EvaluateBody_GeneratorBody(Body, functionObject, argumentsList);
    case 'AsyncGeneratorBody':
      return EvaluateBody_AsyncGeneratorBody(Body, functionObject, argumentsList);
    case 'AsyncBody':
      return EvaluateBody_AsyncFunctionBody(Body, functionObject, argumentsList);
    case 'AsyncConciseBody':
      return EvaluateBody_AsyncConciseBody(Body, functionObject, argumentsList);
    case 'ClassStaticBlockBody':
      return EvaluateClassStaticBlockBody(Body, functionObject);
    default:
      return EvaluateBody_AssignmentExpression(Body, functionObject, argumentsList);
  }
}
