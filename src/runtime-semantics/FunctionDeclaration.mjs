import {
  NormalCompletion,
} from '../completion.mjs';

// 14.1.21 #sec-function-definitions-runtime-semantics-evaluation
// FunctionDeclaration :
//   function BindingIdentifier ( FormalParameters ) { FunctionBody }
//   function ( FormalParameters ) { FunctionBody }
export function Evaluate_FunctionDeclaration() {
  return new NormalCompletion(undefined);
}
