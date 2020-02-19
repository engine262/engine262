export function IsFunctionDefinition(node) {
  if (node.type === 'ParenthesizedExpression') {
    return IsFunctionDefinition(node.Expression);
  }
  return node.type === 'FunctionExpression'
    || node.type === 'GeneratorExpression'
    || node.type === 'GeneratorExpression'
    || node.type === 'ClassExpression'
    || node.type === 'AsyncFunctionExpression';
}
