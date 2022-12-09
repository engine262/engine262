// @ts-nocheck
import { NormalCompletion } from '../completion.mjs';

/** http://tc39.es/ecma262/#sec-module-semantics-runtime-semantics-evaluation */
// ModuleItem : ImportDeclaration
export function Evaluate_ImportDeclaration(_ImportDeclaration) {
  // 1. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}
