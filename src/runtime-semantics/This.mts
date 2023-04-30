// @ts-nocheck
import { ResolveThisBinding } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

/** http://tc39.es/ecma262/#sec-this-keyword-runtime-semantics-evaluation */
// PrimaryExpression : `this`
export function Evaluate_This(_PrimaryExpression) {
  return Q(ResolveThisBinding());
}
