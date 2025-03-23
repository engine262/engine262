import { ResolveBinding } from '../abstract-ops/all.mts';
import { StringValue } from '../static-semantics/all.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { ReferenceRecord } from '../value.mts';
import type { PlainEvaluator } from '../evaluator.mts';

/** https://tc39.es/ecma262/#sec-identifiers-runtime-semantics-evaluation */
// IdentifierReference :
//   Identifier
//   `yield`
//   `await`
export function* Evaluate_IdentifierReference(IdentifierReference: ParseNode.IdentifierReference): PlainEvaluator<ReferenceRecord> {
  // 1. Return ? ResolveBinding(StringValue of Identifier).
  return yield* ResolveBinding(StringValue(IdentifierReference), undefined, IdentifierReference.strict);
}
