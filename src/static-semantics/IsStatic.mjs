// 14.6.9 #sec-static-semantics-isstatic
//   ClassElement :
//     MethodDefinition
//     `static` MethodDefinition
//     `;`
export function IsStatic_ClassElement(ClassElement) {
  return ClassElement.static;
}
