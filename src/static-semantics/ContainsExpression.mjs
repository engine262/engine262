import { OutOfRange } from '../helpers.mjs';

export function ContainsExpression(node) {
  if (Array.isArray(node)) {
    for (const n of node) {
      if (ContainsExpression(n)) {
        return true;
      }
    }
    return false;
  }
  switch (node.type) {
    case 'SingleNameBinding':
      return !!node.Initializer;
    case 'BindingElement':
      if (ContainsExpression(node.BindingPattern)) {
        return true;
      }
      return !!node.Initializer;
    case 'ObjectBindingPattern':
      if (ContainsExpression(node.BindingPropertyList)) {
        return true;
      }
      if (node.BindingRestProperty) {
        return ContainsExpression(node.BindingRestProperty);
      }
      return false;
    case 'BindingProperty':
      if (node.PropertyName && node.PropertyName.ComputedPropertyName) {
        return true;
      }
      return ContainsExpression(node.BindingElement);
    case 'BindingRestProperty':
      if (node.BindingIdentifier) {
        return false;
      }
      return ContainsExpression(node.BindingPattern);
    case 'ArrayBindingPattern':
      if (ContainsExpression(node.BindingElementList)) {
        return true;
      }
      if (node.BindingRestElement) {
        return ContainsExpression(node.BindingRestElement);
      }
      return false;
    case 'BindingRestElement':
      if (node.BindingIdentifier) {
        return false;
      }
      return ContainsExpression(node.BindingPattern);
    case 'Elision':
      return false;
    default:
      throw new OutOfRange('ContainsExpression', node);
  }
}
