import {
  surroundingAgent,
} from '../engine.mjs';
import { X } from '../completion.mjs';
// import { CoveredFormalsList } from '../static-semantics/all.mjs';
import { OrdinaryFunctionCreate, sourceTextMatchedBy } from '../abstract-ops/all.mjs';

// 14.8.16 #sec-async-arrow-function-definitions-runtime-semantics-evaluation
//   AsyncArrowFunction :
//     `async` AsyncArrowBindingIdentifier `=>` AsyncConciseBody
//     CoverCallExpressionAndAsyncArrowHead `=>` AsyncConciseBody
export function Evaluate_AsyncArrowFunction(AsyncArrowFunction) {
  const { params: ArrowFormalParameters } = AsyncArrowFunction;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const parameters = ArrowFormalParameters;
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), parameters, AsyncArrowFunction, 'lexical-this', scope));
  closure.SourceText = sourceTextMatchedBy(AsyncArrowFunction);
  return closure;
}
