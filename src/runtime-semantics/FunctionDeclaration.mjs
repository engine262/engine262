import { NormalCompletion } from '../completion.mjs';

/** http://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluation  */
// FunctionDeclaration :
//   function BindingIdentifier ( FormalParameters ) { FunctionBody }
//   function ( FormalParameters ) { FunctionBody }
export function Evaluate_FunctionDeclaration(_FunctionDeclaration) {
  // 1. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}
