import { surroundingAgent } from '../host-defined/engine.mts';
import { Value } from '../value.mts';
import { Evaluate } from '../evaluator.mts';
import { GetValue, type ECMAScriptFunctionObject } from '../abstract-ops/all.mts';
import { BoundNames, IsAnonymousFunctionDefinition } from '../static-semantics/all.mts';
import { NormalCompletion, Q } from '../completion.mts';
import { OutOfRange } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import {
  NamedEvaluation,
  InitializeBoundName,
  BindingClassDeclarationEvaluation,
} from './all.mts';
import type { FunctionDeclaration } from '#self';

/** https://tc39.es/ecma262/#sec-exports-runtime-semantics-evaluation */
//   ExportDeclaration :
//     `export` ExportFromClause FromClause `;`
//     `export` NamedExports `;`
//     `export` VariableDeclaration
//     `export` Declaration
//     `export` `default` HoistableDeclaration
//     `export` `default` ClassDeclaration
//     `export` `default` AssignmentExpression `;`
export function* Evaluate_ExportDeclaration(ExportDeclaration: ParseNode.ExportDeclaration) {
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
    return yield* Evaluate(ExportDeclaration.Declaration!);
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
    const value = Q(yield* BindingClassDeclarationEvaluation(ClassDeclaration)) as ECMAScriptFunctionObject;
    // 2. Let className be the sole element of BoundNames of ClassDeclaration.
    const className = BoundNames(ClassDeclaration)[0];
    // If className is "*default*", then
    if (className.stringValue() === '*default*') {
      // a. Let env be the running execution context's LexicalEnvironment.
      const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      // b. Perform ? InitializeBoundName("*default*", value, env).
      Q(yield* InitializeBoundName(Value('*default*'), value, env));
    }
    // 3. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }
  if (AssignmentExpression) {
    let value;
    // 1. If IsAnonymousFunctionDefinition(AssignmentExpression) is true, then
    if (IsAnonymousFunctionDefinition(AssignmentExpression)) {
      // a. Let value be NamedEvaluation of AssignmentExpression with argument "default".
      value = yield* NamedEvaluation(AssignmentExpression as FunctionDeclaration, Value('default'));
    } else { // 2. Else,
      // a. Let rhs be the result of evaluating AssignmentExpression.
      const rhs = Q(yield* Evaluate(AssignmentExpression));
      // a. Let value be ? GetValue(rhs).
      value = Q(yield* GetValue(rhs));
    }
    // 3. Let env be the running execution context's LexicalEnvironment.
    const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    // 4. Perform ? InitializeBoundName("*default*", value, env).
    Q(yield* InitializeBoundName(Value('*default*'), value as ECMAScriptFunctionObject, env));
    // 5. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }
  throw new OutOfRange('Evaluate_ExportDeclaration', ExportDeclaration);
}
