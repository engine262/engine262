import { NormalCompletion } from '../completion.mjs';

/** http://tc39.es/ecma262/#sec-statement-semantics-runtime-semantics-evaluation  */
//   HoistableDeclaration :
//     GeneratorDeclaration
//     AsyncFunctionDeclaration
//     AsyncGeneratorDeclaration
export function Evaluate_HoistableDeclaration(_HoistableDeclaration) {
  // 1. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}
