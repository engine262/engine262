import type { ParseNode } from '../parser/ParseNode.mjs';

export function IsDestructuring(node: ParseNode): boolean {
  switch (node.type) {
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
      return false;
  }
}
