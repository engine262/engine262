export function IsDestructuring(node) {
  switch (node.type) {
    case 'ObjectBindingPattern':
    case 'ArrayBindingPattern':
      return true;
    case 'ForDeclaration':
      return IsDestructuring(node.ForBinding);
    default:
      return false;
  }
}
