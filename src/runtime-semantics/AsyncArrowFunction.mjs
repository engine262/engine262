import { Value } from '../value.mjs';
import { NamedEvaluation_AsyncArrowFunction } from './all.mjs';

// 14.8.16 #sec-async-arrow-function-definitions-runtime-semantics-evaluation
//   AsyncArrowFunction :
//     `async` AsyncArrowBindingIdentifier `=>` AsyncConciseBody
//     CoverCallExpressionAndAsyncArrowHead `=>` AsyncConciseBody
export function Evaluate_AsyncArrowFunction(AsyncArrowFunction) {
  return NamedEvaluation_AsyncArrowFunction(AsyncArrowFunction, new Value(''));
}
