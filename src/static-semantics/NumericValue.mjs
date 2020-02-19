// #sec-numericvalue
import { Value } from '../value.mjs';

export function NumericValue(node) {
  return new Value(node.value);
}
