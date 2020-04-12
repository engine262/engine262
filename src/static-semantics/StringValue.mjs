import { Value } from '../value.mjs';

export function StringValue(node) {
  return new Value(node.name);
}
