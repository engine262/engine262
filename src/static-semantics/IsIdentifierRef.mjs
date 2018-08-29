import {
  isIdentifierReference,
} from '../ast.mjs';

// #sec-semantics-static-semantics-isidentifierref
// PrimaryExpression : IdentifierReference
//   1. Return true.
export function IsIdentifierRef(node) {
  return isIdentifierReference(node);
}
