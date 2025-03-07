import type { ParseNode } from '../parser/ParseNode.mjs';

export function DeclarationPart<T extends ParseNode>(node: T): T {
  return node;
}
