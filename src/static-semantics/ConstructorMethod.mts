// @ts-nocheck
import { PropName } from './all.mjs';

/** http://tc39.es/ecma262/#sec-static-semantics-constructormethod */
// ClassElementList :
//   ClassElement
//   ClassElementList ClassElement
export function ConstructorMethod(ClassElementList) {
  return ClassElementList.find((ClassElement) => ClassElement.static === false && PropName(ClassElement) === 'constructor');
}
