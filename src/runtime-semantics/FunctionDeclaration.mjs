import { NormalCompletion } from '../completion.mjs';

// #sec-function-definitions-runtime-semantics-evaluation
// FunctionDeclaration :
//   function BindingIdentifier ( FormalParameters ) { FunctionBody }
//   function ( FormalParameters ) { FunctionBody }
export function Evaluate_FunctionDeclaration(_FunctionDeclaration) {
  // 1. Return NormalCompletion(empty).
  return new NormalCompletion(undefined);
}
