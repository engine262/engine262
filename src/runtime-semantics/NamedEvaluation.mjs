import { surroundingAgent } from '../engine.mjs';
import {
  OrdinaryFunctionCreate,
  SetFunctionName,
  MakeConstructor,
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

export function NamedEvaluation(F, name) {
  switch (F.type) {
    case 'FunctionExpression':
      return NamedEvaluation_FunctionExpression(F, name);
    case 'AsyncFunctionExpression':
      return NamedEvaluation_AsyncFunctionExpression(F, name);
    default:
      throw new OutOfRange('NamedEvaluation', F);
  }
}
