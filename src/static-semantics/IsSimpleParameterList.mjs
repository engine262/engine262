import { isBindingElement, isFunctionRestParameter } from '../ast.mjs';

export function IsSimpleParameterList(list) {
  for (const node of list) {
    switch (true) {
      case isFunctionRestParameter(node):
        return false;
      case isBindingElement(node):
        return false;
      default:
        throw new TypeError('IsSimpleParameterList');
    }
  }
  return true;
}
