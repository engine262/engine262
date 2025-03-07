import type { ParseNode } from '../parser/ParseNode.mjs';

export function IsConstantDeclaration(node: 'const' | ParseNode.LexicalDeclaration | ParseNode.ForDeclaration) {
  // TODO(ts): node === 'const' looks like a typo?
  return node === 'const' || node.LetOrConst === 'const';
}
