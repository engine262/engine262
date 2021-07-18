import { PropName } from './all.mjs';

// #sec-static-semantics-nonconstructorelements
// ClassElementList :
//   ClassElement
//   ClassElementList ClassElement
export function NonConstructorElements(ClassElementList) {
  return ClassElementList.filter((ClassElement) => {
    if (ClassElement.static === false && PropName(ClassElement) === 'constructor') {
      return false;
    }
    return true;
  });
}
