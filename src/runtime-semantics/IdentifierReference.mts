import { ResolveBinding } from '../abstract-ops/all.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { NormalCompletion, ThrowCompletion } from '../completion.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';
import type { ReferenceRecord } from '../value.mjs';

/** https://tc39.es/ecma262/#sec-identifiers-runtime-semantics-evaluation */
// IdentifierReference :
//   Identifier
//   `yield`
//   `await`
export function Evaluate_IdentifierReference(IdentifierReference: ParseNode.IdentifierReference): NormalCompletion<ReferenceRecord> | ThrowCompletion {
  // 1. Return ? ResolveBinding(StringValue of Identifier).
  return ResolveBinding(StringValue(IdentifierReference), undefined, IdentifierReference.strict);
}
