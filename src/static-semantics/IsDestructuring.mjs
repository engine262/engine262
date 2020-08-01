import { OutOfRange } from '../helpers.mjs';

export function IsDestructuring(node) {
  switch (node.type) {
    case 'IdentifierReference':
      return false;
    case 'ObjectBindingPattern':
    case 'ArrayBindingPattern':
    case 'ObjectLiteral':
    case 'ArrayLiteral':
      return true;
    case 'ForDeclaration':
      return IsDestructuring(node.ForBinding);
    case 'ForBinding':
      if (node.BindingIdentifier) {
        return false;
      }
      return true;
    default:
      throw new OutOfRange('IsDestructuring', node);
  }
}
