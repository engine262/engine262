import { isExpression } from '../ast.mjs';

export function ContainsExpression(list) {
  return list.some((node) => isExpression(node));
}
