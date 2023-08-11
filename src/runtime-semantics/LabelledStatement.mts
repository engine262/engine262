// @ts-nocheck
import { ValueSet } from '../helpers.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';
import { LabelledEvaluation } from './all.mjs';

/** https://tc39.es/ecma262/#sec-labelled-statements-runtime-semantics-evaluation */
export function Evaluate_LabelledStatement(LabelledStatement: ParseNode.LabelledStatement) {
  // 1. Let newLabelSet be a new empty List.
  const newLabelSet = new ValueSet();
  // 2. Return LabelledEvaluation of this LabelledStatement with argument newLabelSet.
  return LabelledEvaluation(LabelledStatement, newLabelSet);
}
