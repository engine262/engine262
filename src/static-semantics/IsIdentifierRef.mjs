import {
  isIdentifierReference,
} from '../ast.mjs';

// 12.2.1.4 #sec-semantics-static-semantics-isidentifierref
// PrimaryExpression : IdentifierReference
//   1. Return true.
export function IsIdentifierRef(node) {
  return isIdentifierReference(node);
}
