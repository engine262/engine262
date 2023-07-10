import type { ParseNode } from '../parser/ParseNode.mjs';

export function IsAwaitUsingDeclaration(node: ParseNode) {
  switch (node.type) {
    case 'LexicalDeclaration':
      return false;
    case 'UsingDeclaration':
      return false;
    case 'AwaitUsingDeclaration':
      return true;
    case 'ForDeclaration':
      return false;
    case 'ForUsingDeclaration':
      return false;
    case 'ForAwaitUsingDeclaration':
      return true;
    default:
      return false;
  }
}
