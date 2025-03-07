import { ResolveBinding } from '../abstract-ops/all.mts';
import { StringValue } from '../static-semantics/all.mts';
import { NormalCompletion, ThrowCompletion } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { ReferenceRecord } from '../value.mts';

/** https://tc39.es/ecma262/#sec-identifiers-runtime-semantics-evaluation */
// IdentifierReference :
//   Identifier
//   `yield`
//   `await`
export function Evaluate_IdentifierReference(IdentifierReference: ParseNode.IdentifierReference): NormalCompletion<ReferenceRecord> | ThrowCompletion {
  // 1. Return ? ResolveBinding(StringValue of Identifier).
  return ResolveBinding(StringValue(IdentifierReference), undefined, IdentifierReference.strict);
}
