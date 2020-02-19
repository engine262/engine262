import { ResolveThisBinding } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// #sec-this-keyword-runtime-semantics-evaluation
// PrimaryExpression : `this`
export function Evaluate_This(_PrimaryExpression) {
  return Q(ResolveThisBinding());
}
