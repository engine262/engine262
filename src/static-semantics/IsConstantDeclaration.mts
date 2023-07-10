import type { ParseNode } from '../parser/ParseNode.mjs';

export function IsConstantDeclaration(node: ParseNode | ParseNode.LetOrConst): boolean {
  if (node === 'let') {
    return false;
  }
  if (node === 'const') {
    return true;
  }
  switch (node.type) {
    case 'LexicalDeclaration':
      return IsConstantDeclaration(node.LetOrConst);
    case 'UsingDeclaration':
    case 'AwaitUsingDeclaration':
      return true;
    default:
      return false;
  }
}
