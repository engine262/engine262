export function HasName(node) {
  if (node.type === 'ParenthesizedExpression') {
    return HasName(node.Expression);
  }
  return node.BindingIdentifier !== null;
}
