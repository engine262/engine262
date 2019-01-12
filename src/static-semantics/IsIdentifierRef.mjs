import {
  isIdentifierReference,
} from '../ast.mjs';

// 12.2.1.4 #sec-semantics-static-semantics-isidentifierref
//   PrimaryExpression :
//     IdentifierReference
//     ... (omitted)
//
// 12.3.1.5 #sec-static-semantics-static-semantics-isidentifierref
//   ... (omitted)
export function IsIdentifierRef(node) {
  return isIdentifierReference(node);
}
