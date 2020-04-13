import { PropName } from './all.mjs';

// #sec-static-semantics-constructormethod
// ClassElementList :
//   ClassElement
//   ClassElementList ClassElement
export function ConstructorMethod(ClassElementList) {
  return ClassElementList.find((ClassElement) => ClassElement.static === false && PropName(ClassElement) === 'constructor');
}
