import { PropName } from './all.mjs';

// #sec-static-semantics-nonconstructormethoddefinitions
// ClassElementList :
//   ClassElement
//   ClassElementList ClassElement
export function NonConstructorMethodDefinitions(ClassElementList) {
  return ClassElementList.filter((ClassElement) => {
    if (ClassElement.static === false && PropName(ClassElement) === 'constructor') {
      return false;
    }
    return true;
  });
}
