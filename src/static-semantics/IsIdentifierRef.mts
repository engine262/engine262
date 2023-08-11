import type { ParseNode } from '../parser/ParseNode.mjs';

export function IsIdentifierRef(node: ParseNode): node is ParseNode.IdentifierReference {
  return node.type === 'IdentifierReference';
}
