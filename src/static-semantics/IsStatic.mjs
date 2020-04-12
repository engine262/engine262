// #sec-static-semantics-isstatic
// ClassElement :
//   MethodDefinition
//   `static` MethodDefinition
//   `;`
export function IsStatic(ClassElement) {
  return ClassElement.static;
}
