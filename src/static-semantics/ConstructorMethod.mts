import type { ParseNode } from '../parser/ParseNode.mjs';
import { PropName } from './all.mjs';

/** https://tc39.es/ecma262/#sec-static-semantics-constructormethod */
// ClassElementList :
//   ClassElement
//   ClassElementList ClassElement
export function ConstructorMethod(ClassElementList: ParseNode.ClassElementList) {
  return ClassElementList.find((ClassElement) => ClassElement.static === false && PropName(ClassElement) === 'constructor');
}
