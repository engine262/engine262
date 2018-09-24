import { ResolveThisBinding } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// #sec-this-keyword
// PrimaryExpression : this
export function Evaluate_ThisExpression() {
  return Q(ResolveThisBinding());
}
