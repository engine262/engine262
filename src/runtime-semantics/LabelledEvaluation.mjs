import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { GetValue, ToBoolean } from '../abstract-ops/all.mjs';
import {
  Completion,
  NormalCompletion,
  UpdateEmpty,
  EnsureCompletion,
  Q, X,
} from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-loopcontinues
function LoopContinues(completion, labelSet) {
  // 1. If completion.[[Type]] is normal, return true.
  if (completion.Type === 'normal') {
    return Value.true;
  }
  // 2. If completion.[[Type]] is not continue, return false.
  if (completion.type !== 'continue') {
    return Value.false;
  }
  // 3. If completion.[[Target]] is empty, return true.
  if (completion.Target === undefined) {
    return Value.true;
  }
  // 4. If completion.[[Target]] is an element of labelSet, return true.
  if (labelSet.has(completion.Target)) {
    return Value.true;
  }
  // 5. Return false.
  return Value.false;
}

// #sec-statement-semantics-runtime-semantics-labelledevaluation
//  BreakableStatement :
//    IterationStatement
//    SwitchStatement
//
//  IterationStatement :
//    (DoWhileStatement)
//    (WhileStatement)
export function LabelledEvaluation_BreakableStatement(BreakableStatement, labelSet) {
  switch (BreakableStatement.type) {
    case 'DoWhileStatement':
      return LabelledEvaluation_IterationStatement_DoWhileStatement(BreakableStatement, labelSet);
    case 'WhileStatement':
      return LabelledEvaluation_IterationStatement_WhileStatement(BreakableStatement, labelSet);
    default:
      throw new OutOfRange('LabelledEvaluation_BreakableStatement', BreakableStatement);
  }
}

// #sec-do-while-statement-runtime-semantics-labelledevaluation
//   IterationStatement :
//     `do` Statement `while` `(` Expression `)` `;`
function* LabelledEvaluation_IterationStatement_DoWhileStatement({ Statement, Expression }, labelSet) {
  // 1. Let V be undefined.
  let V = Value.undefined;
  // 2. Repeat,
  while (true) {
    // a. Let stmtResult be the result of evaluating Statement.
    const stmtResult = EnsureCompletion(yield* Evaluate(Statement));
    // b. If LoopContinues(stmtResult, labelSet) is false, return Completion(UpdateEmpty(stmtResult, V)).
    if (LoopContinues(stmtResult, labelSet) === Value.false) {
      return Completion(UpdateEmpty(stmtResult, V));
    }
    // c. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].
    if (stmtResult.Value !== undefined) {
      V = stmtResult.Value;
    }
    // d. Let exprRef be the result of evaluating Expression.
    const exprRef = yield* Evaluate(Expression);
    // e. Let exprValue be ? GetValue(exprRef).
    const exprValue = Q(GetValue(exprRef));
    // f. If ! ToBoolean(exprValue) is false, return NormalCompletion(V).
    if (X(ToBoolean(exprValue)) === Value.false) {
      return NormalCompletion(V);
    }
  }
}


// #sec-while-statement-runtime-semantics-labelledevaluation
//   IterationStatement :
//     `while` `(` Expression `)` Statement
function* LabelledEvaluation_IterationStatement_WhileStatement({ Expression, Statement }, labelSet) {
  // 1. Let V be undefined.
  let V = Value.undefined;
  // 2. Repeat,
  while (true) {
    // a. Let exprRef be the result of evaluating Expression.
    const exprRef = yield* Evaluate(Expression);
    // b. Let exprValue be ? GetValue(exprRef).
    const exprValue = Q(GetValue(exprRef));
    // c. If ! ToBoolean(exprValue) is false, return NormalCompletion(V).
    if (X(ToBoolean(exprValue)) === Value.false) {
      return NormalCompletion(V);
    }
    // d. Let stmtResult be the result of evaluating Statement.
    const stmtResult = EnsureCompletion(yield* Evaluate(Statement));
    // e. If LoopContinues(stmtResult, labelSet) is false, return Completion(UpdateEmpty(stmtResult, V)).
    if (LoopContinues(stmtResult, labelSet) === Value.false) {
      return Completion(UpdateEmpty(stmtResult, V));
    }
    // f. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].
    if (stmtResult.Value !== undefined) {
      V = stmtResult.Value;
    }
  }
}
