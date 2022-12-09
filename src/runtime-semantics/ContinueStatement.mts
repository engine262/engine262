// @ts-nocheck
import { Completion } from '../completion.mjs';
import { StringValue } from '../static-semantics/all.mjs';

/** http://tc39.es/ecma262/#sec-continue-statement-runtime-semantics-evaluation */
//   ContinueStatement :
//     `continue` `;`
//     `continue` LabelIdentifier `;`
export function Evaluate_ContinueStatement({ LabelIdentifier }) {
  if (!LabelIdentifier) {
    // 1. Return Completion { [[Type]]: continue, [[Value]]: empty, [[Target]]: empty }.
    return new Completion({ Type: 'continue', Value: undefined, Target: undefined });
  }
  // 1. Let label be the StringValue of LabelIdentifier.
  const label = StringValue(LabelIdentifier);
  // 2. Return Completion { [[Type]]: continue, [[Value]]: empty, [[Target]]: label }.
  return new Completion({ Type: 'continue', Value: undefined, Target: label });
}
