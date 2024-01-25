/** https://tc39.es/ecma262/#sec-numericvalue */
import type { ParseNode } from '../parser/ParseNode.mjs';
import { Value } from '../value.mjs';

export function NumericValue(node: ParseNode.NumericLiteral) {
  return Value(node.value);
}
