import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { BoundNames, IsAnonymousFunctionDefinition } from '../static-semantics/all.mjs';
import { NormalCompletion, Q } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  NamedEvaluation,
  InitializeBoundName,
  BindingClassDeclarationEvaluation,
} from './all.mjs';

// #sec-exports-runtime-semantics-evaluation
//   ExportDeclaration :
//     `export` ExportFromClause FromClause `;`
//     `export` NamedExports `;`
//     `export` VariableDeclaration
//     `export` Declaration
//     `export` `default` HoistableDeclaration
//     `export` `default` ClassDeclaration
//     `export` `default` AssignmentExpression `;`
export function* Evaluate_ExportDeclaration(ExportDeclaration) {
  const {
    FromClause, NamedExports,
    VariableStatement,
    Declaration,
    default: isDefault,
    HoistableDeclaration,
    ClassDeclaration,
    AssignmentExpression,
  } = ExportDeclaration;

  if (FromClause || NamedExports) {
    // 1. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }
  if (VariableStatement) {
    // 1. Return the result of evaluating VariableStatement.
    return yield* Evaluate(VariableStatement);
  }
  if (Declaration) {
    // 1. Return the result of evaluating Declaration.
    return yield* Evaluate(ExportDeclaration.Declaration);
  }
  if (!isDefault) {
    throw new OutOfRange('Evaluate_ExportDeclaration', ExportDeclaration);
  }
  if (HoistableDeclaration) {
    // 1. Return the result of evaluating HoistableDeclaration.
    return yield* Evaluate(HoistableDeclaration);
  }
  if (ClassDeclaration) {
    // 1. Let value be ? BindingClassDeclarationEvaluation of ClassDeclaration.
    const value = Q(yield* BindingClassDeclarationEvaluation(ClassDeclaration));
    // 2. Let className be the sole element of BoundNames of ClassDeclaration.
    const className = BoundNames(ClassDeclaration)[0];
    // If className is "*default*", then
    if (className.stringValue() === '*default*') {
      // a. Let env be the running execution context's LexicalEnvironment.
      const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      // b. Perform ? InitializeBoundName("*default*", value, env).
      Q(InitializeBoundName(new Value('*default*'), value, env));
    }
    // 3. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }
  if (AssignmentExpression) {
    let value;
    // 1. If IsAnonymousFunctionDefinition(AssignmentExpression) is true, then
    if (IsAnonymousFunctionDefinition(AssignmentExpression)) {
      // a. Let value be NamedEvaluation of AssignmentExpression with argument "default".
      value = yield* NamedEvaluation(AssignmentExpression, new Value('default'));
    } else { // 2. Else,
      // a. Let rhs be the result of evaluating AssignmentExpression.
      const rhs = yield* Evaluate(AssignmentExpression);
      // a. Let value be ? GetValue(rhs).
      value = Q(GetValue(rhs));
    }
    // 3. Let env be the running execution context's LexicalEnvironment.
    const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    // 4. Perform ? InitializeBoundName("*default*", value, env).
    Q(InitializeBoundName(new Value('*default*'), value, env));
    // 5. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }
  throw new OutOfRange('Evaluate_ExportDeclaration', ExportDeclaration);
}
