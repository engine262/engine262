import { Value } from '../value.mjs';
import { ContinueCompletion } from '../completion.mjs';

// #sec-continue-statement-runtime-semantics-evaluation
// ContinueStatement :
//   `continue` `;`
//   `continue` LabelIdentifier `;`
export function Evaluate_ContinueStatement({ label: LabelIdentifier }) {
  if (LabelIdentifier) {
    const label = new Value(LabelIdentifier.name);
    return new ContinueCompletion(label);
  } else {
    return new ContinueCompletion(undefined);
  }
}
