import { surroundingAgent } from '../engine.mjs';
import { Type, New as NewValue } from '../value.mjs';
import {
  Assert,
  GetValue,
  ToBoolean,
  LoopContinues,
} from '../abstract-ops/all.mjs';
import {
  Q, X, ReturnIfAbrupt,
  Completion,
  AbruptCompletion,
  NormalCompletion,
  UpdateEmpty,
} from '../completion.mjs';
import {
  isForStatementWithExpression,
  isForStatementWithVariableStatement,
  isForStatementWithLexicalDeclaration,
} from '../ast.mjs';
import {
  IsConstantDeclaration,
  BoundNames_LexicalDeclaration,
} from '../static-semantics/all.mjs';
import { Evaluate_Expression, Evaluate_Statement } from '../evaluator.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-createperiterationenvironment
function CreatePerIterationEnvironment(perIterationBindings) {
  if (perIterationBindings.length > 0) {
    const lastIterationEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    const lastIterationEnvRec = lastIterationEnv.EnvironmentRecord;
    const outer = lastIterationEnv.outerEnvironmentReference;
    Assert(Type(outer) !== 'Null');
    const thisIterationEnv = NewDeclarativeEnvironment(outer);
    const thisIterationEnvRec = thisIterationEnv.EnvironmentRecord;
    for (const bn of perIterationBindings) {
      X(thisIterationEnvRec.CreateMutableBinding(bn, NewValue(false)));
      const lastValue = Q(lastIterationEnvRec.GetBindingValue(bn, NewValue(true)));
      thisIterationEnvRec.InitializeBinding(bn, lastValue);
    }
    surroundingAgent.runningExecutionContext.LexicalEnvironment = thisIterationEnv;
  }
  return NewValue(undefined);
}

// #sec-forbodyevaluation
function ForBodyEvaluation(test, increment, stmt, perIterationBindings, labelSet) {
  let V = NewValue(undefined);
  Q(CreatePerIterationEnvironment(perIterationBindings));
  while (true) {
    if (test) {
      const testRef = Evaluate_Expression(test);
      const testValue = Q(GetValue(testRef));
      if (ToBoolean(testValue).isFalse()) {
        return new NormalCompletion(V);
      }
    }
    const result = Evaluate_Statement(stmt);
    if (LoopContinues(result, labelSet).isFalse()) {
      return new Completion(UpdateEmpty(result, V));
    }
    if (result.Value !== undefined) {
      V = result.Value;
    }
    Q(CreatePerIterationEnvironment(perIterationBindings));
    if (increment) {
      const incRef = Evaluate_Expression(increment);
      Q(GetValue(incRef));
    }
  }
}

// #sec-for-statement-runtime-semantics-labelledevaluation
// IterationStatement :
//   `for` `(` Expression `;` Expression `;` Expression `)` Statement
//   `for` `(` `var` VariableDeclarationList `;` Expression `;` Expression `)` Statement
//   `for` `(` LexicalDeclarationExpression `;` Expression `)` Statement
export function Evaluate_ForStatement(ForStatement, labelSet = []) {
  switch (true) {
    case isForStatementWithExpression(ForStatement):
      if (ForStatement.init) {
        const exprRef = Evaluate_Expression(ForStatement.init);
        Q(GetValue(exprRef));
      }
      return Q(ForBodyEvaluation(ForStatement.test, ForStatement.update, ForStatement.body, [], labelSet));
    case isForStatementWithVariableStatement(ForStatement): {
      let varDcl = Evaluate_Statement(ForStatement.init);
      ReturnIfAbrupt(varDcl);
      return Q(ForBodyEvaluation(ForStatement.test, ForStatement.update, ForStatement.body, [], labelSet));
    }
    case isForStatementWithLexicalDeclaration(ForStatement): {
      const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      const loopEnv = NewDeclarativeEnvironment(oldEnv);
      const loopEnvRec = loopEnv.EnvironmentRecord;
      const isConst = IsConstantDeclaration(ForStatement.init);
      const boundNames = BoundNames_LexicalDeclaration(ForStatement.init).map(NewValue);
      for (const dn of boundNames) {
        if (isConst) {
          X(loopEnvRec.CreateImmutableBinding(dn, NewValue(true)));
        } else {
          X(loopEnvRec.CreateMutableBinding(dn, NewValue(true)));
        }
      }
      surroundingAgent.runningExecutionContext.LexicalEnvironment = loopEnv;
      const forDcl = Evaluate_Statement(ForStatement.init);
      if (forDcl instanceof AbruptCompletion) {
        surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
        return new Completion(forDcl);
      }
      const perIterationLets = isConst ? [] : boundNames;
      const bodyResult = ForBodyEvaluation(ForStatement.test, ForStatement.update, ForStatement.body, perIterationLets, labelSet);
      surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
      return new Completion(bodyResult);
    }
    default:
      throw outOfRange('Evaluate_ForStatement', ForStatement);
  }
}
