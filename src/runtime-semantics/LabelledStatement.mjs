import { Value } from '../value.mjs';
import { Completion, EnsureCompletion, NormalCompletion } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { isBreakableStatement, isLabelledStatement, isStatement } from '../ast.mjs';
import { SameValue } from '../abstract-ops/all.mjs';
import {
  LabelledEvaluation_BreakableStatement,
// LabelledEvaluation_IterationStatement,
} from './all.mjs';
import { ValueSet, OutOfRange } from '../helpers.mjs';

// 13.13.14 #sec-labelled-statements-runtime-semantics-labelledevaluation
function* LabelledEvaluation({
  label: LabelIdentifier,
  body: LabelledItem,
}, labelSet) {
  const label = new Value(LabelIdentifier.name);
  labelSet.add(label);
  let stmtResult;
  switch (true) {
    case isBreakableStatement(LabelledItem):
      stmtResult = yield* LabelledEvaluation_BreakableStatement(LabelledItem, labelSet);
      break;
    case isLabelledStatement(LabelledItem):
      stmtResult = yield* LabelledEvaluation(LabelledItem, labelSet);
      break;
    case isStatement(LabelledItem):
      stmtResult = yield* Evaluate(LabelledItem);
      break;
    default:
      throw new OutOfRange('LabelledEvaluation', LabelledItem);
  }
  stmtResult = EnsureCompletion(stmtResult);
  if (stmtResult.Type === 'break' && SameValue(stmtResult.Target, label) === Value.true) {
    stmtResult = new NormalCompletion(stmtResult.Value);
  }
  return Completion(stmtResult);
}

// 13.13.15 #sec-labelled-statements-runtime-semantics-evaluation
export function* Evaluate_LabelledStatement(LabelledStatement) {
  const newLabelSet = new ValueSet();
  return yield* LabelledEvaluation(LabelledStatement, newLabelSet);
}
