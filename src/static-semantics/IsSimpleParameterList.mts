import { OutOfRange, isArray } from '../helpers.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';

export function IsSimpleParameterList(node: ParseNode | readonly ParseNode[]) {
  if (isArray(node)) {
    for (const n of node) {
      if (!IsSimpleParameterList(n)) {
        return false;
      }
    }
    return true;
  }
  switch (node.type) {
    case 'SingleNameBinding':
      return node.Initializer === null;
    case 'BindingElement':
      return false;
    case 'BindingRestElement':
      return false;
    default:
      throw new OutOfRange('IsSimpleParameterList', node);
  }
}
