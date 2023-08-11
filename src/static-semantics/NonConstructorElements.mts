import type { ParseNode } from '../parser/ParseNode.mjs';
import { PropName } from './all.mjs';

/** https://tc39.es/ecma262/#sec-static-semantics-nonconstructorelements */
// ClassElementList :
//   ClassElement
//   ClassElementList ClassElement
export function NonConstructorElements(ClassElementList: ParseNode.ClassElementList) {
  return ClassElementList.filter((ClassElement) => {
    if (ClassElement.static === false && PropName(ClassElement) === 'constructor') {
      return false;
    }
    return true;
  });
}
