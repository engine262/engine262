// @ts-nocheck
import { OutOfRange } from '../helpers.mjs';

export function IsSimpleParameterList(node) {
  if (Array.isArray(node)) {
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
