import {
  isIterationStatement,
  isSwitchStatement,
} from '../ast.mjs';
import {
  Completion,
  EnsureCompletion,
  NormalCompletion,
} from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { Value } from '../value.mjs';
import {
  Evaluate_SwitchStatement,
  LabelledEvaluation_IterationStatement,
} from './all.mjs';

// #sec-statement-semantics-runtime-semantics-evaluation
//   BreakableStatement :
//     IterationStatement
//     SwitchStatement
export function* Evaluate_BreakableStatement(BreakableStatement) {
  const newLabelSet = [];
  return yield* LabelledEvaluation_BreakableStatement(BreakableStatement, newLabelSet);
}

// #sec-statement-semantics-runtime-semantics-labelledevaluation
//   BreakableStatement : IterationStatement
export function* LabelledEvaluation_BreakableStatement(BreakableStatement, labelSet) {
  switch (true) {
    case isIterationStatement(BreakableStatement): {
      let stmtResult = EnsureCompletion(yield* LabelledEvaluation_IterationStatement(BreakableStatement, labelSet));
      if (stmtResult.Type === 'break') {
        if (stmtResult.Target === undefined) {
          if (stmtResult.Value === undefined) {
            stmtResult = new NormalCompletion(Value.undefined);
          } else {
            stmtResult = new NormalCompletion(stmtResult.Value);
          }
        }
      }
      return Completion(stmtResult);
    }

    case isSwitchStatement(BreakableStatement): {
      let stmtResult = EnsureCompletion(yield* Evaluate_SwitchStatement(BreakableStatement, labelSet));
      if (stmtResult.Type === 'break') {
        if (stmtResult.Target === undefined) {
          if (stmtResult.Value === undefined) {
            stmtResult = new NormalCompletion(Value.undefined);
          } else {
            stmtResult = new NormalCompletion(stmtResult.Value);
          }
        }
      }
      return Completion(stmtResult);
    }

    default:
      throw new OutOfRange('LabelledEvaluation_BreakableStatement', BreakableStatement);
  }
}
