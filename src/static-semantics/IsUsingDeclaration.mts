import type { ParseNode } from '../parser/ParseNode.mjs';

export function IsUsingDeclaration(node: ParseNode) {
  switch (node.type) {
    case 'LexicalDeclaration':
      return false;
    case 'UsingDeclaration':
    case 'AwaitUsingDeclaration':
      return true;
    case 'ForDeclaration':
      return false;
    case 'ForUsingDeclaration':
      return true;
    case 'ForAwaitUsingDeclaration':
      return true;
    default:
      return false;
  }
}
