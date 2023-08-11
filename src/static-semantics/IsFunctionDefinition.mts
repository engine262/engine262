import type { ParseNode } from '../parser/ParseNode.mjs';

export function IsFunctionDefinition(node: ParseNode): boolean {
  if (node.type === 'ParenthesizedExpression') {
    return IsFunctionDefinition(node.Expression);
  }
  return node.type === 'FunctionExpression'
    || node.type === 'GeneratorExpression'
    || node.type === 'AsyncGeneratorExpression'
    || node.type === 'AsyncFunctionExpression'
    || node.type === 'ClassExpression'
    || node.type === 'ArrowFunction'
    || node.type === 'AsyncArrowFunction';
}
