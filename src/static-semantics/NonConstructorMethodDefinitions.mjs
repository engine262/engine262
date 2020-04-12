import { PropName } from './all.mjs';

// #sec-static-semantics-nonconstructormethoddefinitions
// ClassElementList :
//   ClassElement
//   ClassElementList ClassElement
export function NonConstructorMethodDefinitions(ClassElementList) {
  return ClassElementList.filter((ClassElement) => PropName(ClassElement) !== 'constructor');
}
