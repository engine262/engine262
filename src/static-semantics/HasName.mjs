// #sec-function-definitions-static-semantics-hasname
// FunctionExpression :
//   function ( FormalParameters ) { FunctionBody }
//     1. Return false.
//   function BindingIdentifier ( FormalParameters ) { FunctionBody }
//     1. Return true.
export function HasName(node) {
  return node.id !== null;
}
