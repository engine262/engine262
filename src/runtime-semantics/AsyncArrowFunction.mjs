import {
  surroundingAgent,
} from '../engine.mjs';
import { X } from '../completion.mjs';
// import { CoveredFormalsList } from '../static-semantics/all.mjs';
import { AsyncFunctionCreate, sourceTextMatchedBy } from '../abstract-ops/all.mjs';

// 14.8.16 #sec-async-arrow-function-definitions-runtime-semantics-evaluation
//   AsyncArrowFunction :
//     `async` AsyncArrowBindingIdentifier `=>` AsyncConciseBody
//     CoverCallExpressionAndAsyncArrowHead `=>` AsyncConciseBody
export function Evaluate_AsyncArrowFunction(AsyncArrowFunction) {
  const { params: ArrowFormalParameters } = AsyncArrowFunction;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const parameters = ArrowFormalParameters;
  const closure = X(AsyncFunctionCreate('Arrow', parameters, AsyncArrowFunction, scope));
  closure.SourceText = sourceTextMatchedBy(AsyncArrowFunction);
  return closure;
}
