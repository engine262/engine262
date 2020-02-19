import { Value } from '../value.mjs';
import { NamedEvaluation } from './all.mjs';

export function Evaluate_ArrowFunction(ArrowFunction) {
  // 1. Return the result of performing NamedEvaluation for this ArrowFunction with argument "".
  return NamedEvaluation(ArrowFunction, new Value(''));
}
