import type { ParseNode } from '../parser/ParseNode.mts';

export function IsConstantDeclaration(node: ParseNode | ParseNode.LetOrConst) {
  return node === 'const' || (typeof node === 'object' && 'LetOrConst' in node && node.LetOrConst === 'const');
}
