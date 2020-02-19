import { NormalCompletion } from '../completion.mjs';

// #sec-statement-semantics-runtime-semantics-evaluation
//   HoistableDeclaration :
//     GeneratorDeclaration
//     AsyncFunctionDeclaration
//     AsyncGeneratorDeclaration
export function Evaluate_HoistableDeclaration(_HoistableDeclaration) {
  // 1. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}
