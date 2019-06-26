import { GetNewTarget } from '../abstract-ops/all.mjs';

// 12.3.9.1 #sec-meta-properties-runtime-semantics-evaluation
// NewTarget : `new` `.` `target`
function Evaluate_NewTarget() {
  return GetNewTarget();
}

// #prod-MetaProperty
// MetaProperty : NewTarget
export function* Evaluate_MetaProperty() { // eslint-disable-line require-yield
  return Evaluate_NewTarget();
}
