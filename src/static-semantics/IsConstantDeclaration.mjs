export function IsConstantDeclaration(node) {
  return node.type === 'LexicalDeclaration' && node.LetOrConst === 'const';
}
