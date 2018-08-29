import {
  NormalCompletion,
} from '../completion.mjs';

// #sec-function-definitions-runtime-semantics-evaluation<Paste>
// FunctionDeclaration :
//   function BindingIdentifier ( FormalParameters ) { FunctionBody }
//   function ( FormalParameters ) { FunctionBody }
export function Evaluate_FunctionDeclaration() {
  return new NormalCompletion(undefined);
}
