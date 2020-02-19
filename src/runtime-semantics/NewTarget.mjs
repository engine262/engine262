import { GetNewTarget } from '../abstract-ops/all.mjs';

// #sec-meta-properties-runtime-semantics-evaluation
// NewTarget : `new` `.` `target`
export function Evaluate_NewTarget() {
  // 1. Return GetNewTarget().
  return GetNewTarget();
}
