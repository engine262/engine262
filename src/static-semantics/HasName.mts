import type { ParseNode } from '../parser/ParseNode.mjs';

export function HasName(node: ParseNode): boolean {
  if (node.type === 'ParenthesizedExpression') {
    return HasName(node.Expression);
  }
  return 'BindingIdentifier' in node && !!node.BindingIdentifier;
}
