import { Value } from '../value.mjs';

export function TemplateStrings(node, raw) {
  return node.TemplateSpanList.map(Value);
}
