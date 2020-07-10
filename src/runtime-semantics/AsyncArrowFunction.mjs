import { Value } from '../value.mjs';
import { NamedEvaluation } from './all.mjs';

export function Evaluate_AsyncArrowFunction(AsyncArrowFunction) {
  // 1. Return the result of performing NamedEvaluation for this ArrowFunction with argument "".
  return NamedEvaluation(AsyncArrowFunction, new Value(''));
}
