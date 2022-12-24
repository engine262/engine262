// @ts-nocheck
export function IsConstantDeclaration(node) {
  return node === 'const' || node.LetOrConst === 'const';
}
