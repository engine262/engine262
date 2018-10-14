import { GetNewTarget } from '../abstract-ops/all.mjs';

// #sec-meta-properties-runtime-semantics-evaluation<Paste>
// NewTarget : `new` `.` `target`
function Evaluate_NewTarget() {
  return GetNewTarget();
}

// #prod-MetaProperty
// MetaProperty : NewTarget
export function* Evaluate_MetaProperty() { // eslint-disable-line require-yield
  return Evaluate_NewTarget();
}
