import { New as NewValue } from '../value.mjs';
import { ResolveBinding } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// #sec-identifiers-runtime-semantics-evaluation
// IdentifierReference :
//   Identifier
//   yield
//   await
export function Evaluate_Identifier(Identifier) {
  return Q(ResolveBinding(NewValue(Identifier.name)));
}
