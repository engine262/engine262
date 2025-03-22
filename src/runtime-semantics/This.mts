import { ResolveThisBinding } from '../abstract-ops/all.mts';
import { Q, type ValueCompletion } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-this-keyword-runtime-semantics-evaluation */
// PrimaryExpression : `this`
export function Evaluate_This(_PrimaryExpression: ParseNode.ThisExpression): ValueCompletion {
  return Q(ResolveThisBinding());
}
