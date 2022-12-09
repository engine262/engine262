// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import {
  Completion,
  AbruptCompletion,
  UpdateEmpty,
  EnsureCompletion,
  X,
} from '../completion.mjs';
import { BoundNames } from '../static-semantics/all.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { OutOfRange } from '../helpers.mjs';
import { BindingInitialization } from './all.mjs';

/** http://tc39.es/ecma262/#sec-try-statement-runtime-semantics-evaluation */
//   TryStatement :
//     `try` Block Catch
//     `try` Block Finally
//     `try` Block Catch Finally
export function Evaluate_TryStatement(TryStatement) {
  switch (true) {
    case !!TryStatement.Catch && !TryStatement.Finally:
      return Evaluate_TryStatement_BlockCatch(TryStatement);
    case !TryStatement.Catch && !!TryStatement.Finally:
      return Evaluate_TryStatement_BlockFinally(TryStatement);
    case !!TryStatement.Catch && !!TryStatement.Finally:
      return Evaluate_TryStatement_BlockCatchFinally(TryStatement);
    default:
      throw new OutOfRange('Evaluate_TryStatement', TryStatement);
  }
}

// TryStatement : `try` Block Catch
function* Evaluate_TryStatement_BlockCatch({ Block, Catch }) {
  // 1. Let B be the result of evaluating Block.
  const B = EnsureCompletion(yield* Evaluate(Block));
  // 2. If B.[[Type]] is throw, let C be CatchClauseEvaluation of Catch with argument B.[[Value]].
  let C;
  if (B.Type === 'throw') {
    C = EnsureCompletion(yield* CatchClauseEvaluation(Catch, B.Value));
  } else { // 3. Else, let C be B.
    C = B;
  }
  // 3. Return Completion(UpdateEmpty(C, undefined)).
  return Completion(UpdateEmpty(C, Value.undefined));
}

// TryStatement : `try` Block Finally
function* Evaluate_TryStatement_BlockFinally({ Block, Finally }) {
  // 1. Let B be the result of evaluating Block.
  const B = EnsureCompletion(yield* Evaluate(Block));
  // 1. Let F be the result of evaluating Finally.
  let F = EnsureCompletion(yield* Evaluate(Finally));
  // 1. If F.[[Type]] is normal, set F to B.
  if (F.Type === 'normal') {
    F = B;
  }
  // 1. Return Completion(UpdateEmpty(F, undefined)).
  return Completion(UpdateEmpty(F, Value.undefined));
}

// TryStatement : `try` Block Catch Finally
function* Evaluate_TryStatement_BlockCatchFinally({ Block, Catch, Finally }) {
  // 1. Let B be the result of evaluating Block.
  const B = EnsureCompletion(yield* Evaluate(Block));
  // 2. If B.[[Type]] is throw, let C be CatchClauseEvaluation of Catch with argument B.[[Value]].
  let C;
  if (B.Type === 'throw') {
    C = EnsureCompletion(yield* CatchClauseEvaluation(Catch, B.Value));
  } else { // 3. Else, let C be B.
    C = B;
  }
  // 4. Let F be the result of evaluating Finally.
  let F = EnsureCompletion(yield* Evaluate(Finally));
  // 5. If F.[[Type]] is normal, set F to C.
  if (F.Type === 'normal') {
    F = C;
  }
  // 6. Return Completion(UpdateEmpty(F, undefined)).
  return Completion(UpdateEmpty(F, Value.undefined));
}

/** http://tc39.es/ecma262/#sec-runtime-semantics-catchclauseevaluation */
//  Catch :
//    `catch` Block
//    `catch` `(` CatchParameter `)` Block
function* CatchClauseEvaluation({ CatchParameter, Block }, thrownValue) {
  if (!CatchParameter) {
    // 1. Return the result of evaluating Block.
    return yield* Evaluate(Block);
  }
  // 1. Let oldEnv be the running execution context's LexicalEnvironment.
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let catchEnv be NewDeclarativeEnvironment(oldEnv).
  const catchEnv = NewDeclarativeEnvironment(oldEnv);
  // 3. For each element argName of the BoundNames of CatchParameter, do
  for (const argName of BoundNames(CatchParameter)) {
    // a. Perform ! catchEnv.CreateMutableBinding(argName, false).
    X(catchEnv.CreateMutableBinding(argName, Value.false));
  }
  // 4. Set the running execution context's LexicalEnvironment to catchEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = catchEnv;
  // 5. Let status be BindingInitialization of CatchParameter with arguments thrownValue and catchEnv.
  const status = yield* BindingInitialization(CatchParameter, thrownValue, catchEnv);
  // 6. If status is an abrupt completion, then
  if (status instanceof AbruptCompletion) {
    // a. Set the running execution context's LexicalEnvironment to oldEnv.
    surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
    // b. Return Completion(status).
    return Completion(status);
  }
  // 7. Let B be the result of evaluating Block.
  const B = EnsureCompletion(yield* Evaluate(Block));
  // 8. Set the running execution context's LexicalEnvironment to oldEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  // 9. Return Completion(B).
  return Completion(B);
}
