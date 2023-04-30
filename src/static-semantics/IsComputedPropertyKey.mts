// @ts-nocheck
export function IsComputedPropertyKey(node) {
  return node.type !== 'IdentifierName'
    && node.type !== 'StringLiteral'
    && node.type !== 'NumericLiteral';
}
