// @ts-nocheck
/** https://tc39.es/ecma262/#sec-numericvalue */
import { Value } from '../value.mjs';

export function NumericValue(node) {
  return Value(node.value);
}
