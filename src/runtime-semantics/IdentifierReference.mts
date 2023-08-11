// @ts-nocheck
import { ResolveBinding } from '../abstract-ops/all.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { Q } from '../completion.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';

/** https://tc39.es/ecma262/#sec-identifiers-runtime-semantics-evaluation */
// IdentifierReference :
//   Identifier
//   `yield`
//   `await`
export function Evaluate_IdentifierReference(IdentifierReference: ParseNode.IdentifierReference) {
  // 1. Return ? ResolveBinding(StringValue of Identifier).
  return Q(ResolveBinding(StringValue(IdentifierReference), undefined, IdentifierReference.strict));
}
