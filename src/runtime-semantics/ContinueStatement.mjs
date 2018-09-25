import { ContinueCompletion } from '../completion.mjs';

// #sec-continue-statement-runtime-semantics-evaluation
// ContinueStatement :
//   `continue` `;`
//   `continue` LabelIdentifier `;`
export function Evaluate_ContinueStatement({ label: LabelIdentifier }) {
  return new ContinueCompletion(LabelIdentifier || undefined);
}
