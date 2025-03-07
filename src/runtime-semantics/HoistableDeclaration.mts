import { NormalCompletion } from '../completion.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';

/** https://tc39.es/ecma262/#sec-statement-semantics-runtime-semantics-evaluation */
//   HoistableDeclaration :
//     GeneratorDeclaration
//     AsyncFunctionDeclaration
//     AsyncGeneratorDeclaration
export function Evaluate_HoistableDeclaration(_HoistableDeclaration: ParseNode.HoistableDeclaration) {
  // 1. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}
