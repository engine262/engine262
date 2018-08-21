import {
  surroundingAgent,
} from '../engine.mjs';
import {
  isTryStatementWithCatch,
  isTryStatementWithFinally,
} from '../ast.mjs';
import {
  BoundNames_CatchParameter,
} from '../static-semantics/all.mjs';
import {
  New as NewValue,
} from '../value.mjs';
import {
  X,
  UpdateEmpty,
  AbruptCompletion,
} from '../completion.mjs';
import {
  Evaluate,
} from '../evaluator.mjs';
import {
  NewDeclarativeEnvironment,
} from '../environment.mjs';
import {
  BindingInitialization,
} from './all.mjs';

// #sec-runtime-semantics-catchclauseevaluation
//    Catch : catch ( CatchParameter ) Block
//    With parameter thrownValue.
function CatchClauseEvaluation(Catch, thrownValue) {
  const CatchParameter = Catch.param;
  const Block = Catch.body;
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const catchEnv = NewDeclarativeEnvironment(oldEnv);
  const catchEnvRec = catchEnv.EnvironmentRecord;
  for (const argName of BoundNames_CatchParameter(CatchParameter)) {
    X(catchEnvRec.CreateMutableBinding(NewValue(argName), false));
  }
  surroundingAgent.runningExecutionContext.LexicalEnvironment = catchEnv;
  const status = BindingInitialization(CatchParameter, thrownValue, catchEnv);
  if (status instanceof AbruptCompletion) {
    surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
    return status;
  }
  const B = Evaluate(Block);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return B;
}

function Evaluate_TryStatement_Catch(Block, Catch) {
  const B = Evaluate(Block);
  let C;
  if (B.Type === 'throw') {
    C = CatchClauseEvaluation(Catch, B.Value);
  } else {
    C = B;
  }
  return UpdateEmpty(C, NewValue(undefined));
}

function Evaluate_TryStatement_Finally(Block, Finally) {
  const B = Evaluate(Block);
  let F = Evaluate(Finally);
  if (F.Type === 'normal') {
    F = B;
  }
  return UpdateEmpty(F, NewValue(undefined));
}

function Evaluate_TryStatement_CatchFinally(Block, Catch, Finally) {
  const B = Evaluate(Block);
  let C;
  if (B.Type === 'throw') {
    C = CatchClauseEvaluation(Catch, B.Value);
  } else {
    C = B;
  }
  let F = Evaluate(Finally);
  if (F.Type === 'normal') {
    F = C;
  }
  return UpdateEmpty(F, NewValue(undefined));
}

// #sec-try-statement-runtime-semantics-evaluation
export function Evaluate_TryStatement(Expression) {
  switch (true) {
    // TryStatement : try Block Catch Finally
    case isTryStatementWithCatch(Expression) && isTryStatementWithFinally(Expression):
      return Evaluate_TryStatement_CatchFinally(
        Expression.block, Expression.handler, Expression.finalizer,
      );
    // TryStatement : try Block Catch
    case isTryStatementWithCatch(Expression):
      return Evaluate_TryStatement_Catch(Expression.block, Expression.handler);
    // TryStatement : try Block Finally
    case isTryStatementWithFinally(Expression):
      return Evaluate_TryStatement_Finally(Expression.block, Expression.finalizer);

    default:
      throw new RangeError('EvaluateTryStatement');
  }
}
