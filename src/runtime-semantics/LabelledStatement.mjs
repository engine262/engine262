import { Value } from '../value.mjs';
import { Completion, EnsureCompletion, NormalCompletion } from '../completion.mjs';
import { Evaluate_Statement } from '../evaluator.mjs';
import { isBreakableStatement, isLabelledStatement, isStatement } from '../ast.mjs';
import { SameValue } from '../abstract-ops/all.mjs';
import {
  LabelledEvaluation_BreakableStatement,
// LabelledEvaluation_IterationStatement,
} from './all.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-labelled-statements-runtime-semantics-labelledevaluation
function* LabelledEvaluation({
  label: LabelIdentifier,
  body: LabelledItem,
}, labelSet) {
  const label = new Value(LabelIdentifier.name);
  labelSet.push(label);
  let stmtResult;
  switch (true) {
    case isBreakableStatement(LabelledItem):
      stmtResult = yield* LabelledEvaluation_BreakableStatement(LabelledItem, labelSet);
      break;
    case isLabelledStatement(LabelledItem):
      stmtResult = yield* LabelledEvaluation(LabelledItem, labelSet);
      break;
    case isStatement(LabelledItem):
      stmtResult = yield* Evaluate_Statement(LabelledItem);
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

// #sec-labelled-statements-runtime-semantics-evaluation
export function* Evaluate_LabelledStatement(LabelledStatement) {
  const newLabelSet = [];
  return yield* LabelledEvaluation(LabelledStatement, newLabelSet);
}
