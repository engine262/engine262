// @ts-nocheck
export function IsDestructuring(node) {
  switch (node.type) {
    case 'ObjectBindingPattern':
    case 'ArrayBindingPattern':
    case 'ObjectLiteral':
    case 'ArrayLiteral':
      return true;
    case 'ForDeclaration':
    case 'ForUsingDeclaration':
    case 'ForAwaitUsingDeclaration':
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
