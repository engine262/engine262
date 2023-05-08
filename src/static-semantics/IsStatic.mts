// @ts-nocheck
/** https://tc39.es/ecma262/#sec-static-semantics-isstatic */
// ClassElement :
//   MethodDefinition
//   `static` MethodDefinition
//   `;`
export function IsStatic(ClassElement) {
  return ClassElement.static;
}
