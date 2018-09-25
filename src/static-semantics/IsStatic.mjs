// #sec-static-semantics-isstatic
// ClassElement :
//   MethodDefinition
//   `static` MethodDefinition
//   `;`
export function IsStatic(node) {
  return node.static;
}
