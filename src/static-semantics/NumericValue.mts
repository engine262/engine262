/** https://tc39.es/ecma262/#sec-numericvalue */
import type { ParseNode } from '../parser/ParseNode.mts';
import { Value } from '../value.mts';

export function NumericValue(node: ParseNode.NumericLiteral) {
  return Value(node.value);
}
