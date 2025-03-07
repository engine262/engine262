import type { ParseNode } from '../parser/ParseNode.mjs';
import { InstantiateArrowFunctionExpression } from './all.mjs';

/** https://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-evaluation */
export function Evaluate_ArrowFunction(ArrowFunction: ParseNode.ArrowFunction) {
  // 1. Return InstantiateArrowFunctionExpression of ArrowFunction.
  return InstantiateArrowFunctionExpression(ArrowFunction);
}
