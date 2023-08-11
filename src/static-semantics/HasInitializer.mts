import type { ParseNode } from '../parser/ParseNode.mjs';

export function HasInitializer(node: ParseNode): node is ParseNode & { readonly Initializer: ParseNode.Initializer; } {
  return 'Initializer' in node && !!node.Initializer;
}
