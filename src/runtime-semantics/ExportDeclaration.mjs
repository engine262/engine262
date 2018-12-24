import {
  isExportDeclarationWithStar,
  isExportDeclarationWithVariable,
  isExportDeclarationWithDeclaration,
  isExportDeclarationWithExport,
  isExportDeclarationWithExportAndFrom,
  isExportDeclarationWithDefaultAndHoistable,
  isExportDeclarationWithDefaultAndClass,
  isExportDeclarationWithDefaultAndExpression,
} from '../ast.mjs';
import { BoundNames_ClassDeclaration, IsAnonymousFunctionDefinition } from '../static-semantics/all.mjs';
import { BindingClassDeclarationEvaluation_ClassDeclaration, InitializeBoundName } from './all.mjs';
import { HasOwnProperty, SetFunctionName, GetValue } from '../abstract-ops/all.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { NormalCompletion, ReturnIfAbrupt, Q } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { OutOfRange } from '../helpers.mjs';

export function* Evaluate_ExportDeclaration(ExportDeclaration) {
  switch (true) {
    case isExportDeclarationWithStar(ExportDeclaration):
    case isExportDeclarationWithExportAndFrom(ExportDeclaration):
    case isExportDeclarationWithExport(ExportDeclaration):
      return new NormalCompletion(undefined);
    case isExportDeclarationWithVariable(ExportDeclaration):
    case isExportDeclarationWithDeclaration(ExportDeclaration):
    case isExportDeclarationWithDefaultAndHoistable(ExportDeclaration):
      return yield* Evaluate(ExportDeclaration.declaration);
    case isExportDeclarationWithDefaultAndClass(ExportDeclaration): {
      const ClassDeclaration = ExportDeclaration.declaration;

      const value = yield* BindingClassDeclarationEvaluation_ClassDeclaration(ClassDeclaration);
      ReturnIfAbrupt(value);
      const className = BoundNames_ClassDeclaration(ClassDeclaration)[0];
      if (className === '*default*') {
        const hasNameProperty = Q(HasOwnProperty(value, new Value('name')));
        if (hasNameProperty === Value.false) {
          SetFunctionName(value, new Value('default'));
        }
        const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
        Q(InitializeBoundName(new Value('*default*'), value, env));
      }
      return new NormalCompletion(undefined);
    }
    case isExportDeclarationWithDefaultAndExpression(ExportDeclaration): {
      const AssignmentExpression = ExportDeclaration.declaration;

      const rhs = yield* Evaluate(AssignmentExpression);
      const value = Q(GetValue(rhs));
      if (IsAnonymousFunctionDefinition(AssignmentExpression)) {
        const hasNameProperty = Q(HasOwnProperty(value, new Value('name')));
        if (hasNameProperty === Value.false) {
          SetFunctionName(value, new Value('default'));
        }
      }
      const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      Q(InitializeBoundName(new Value('*default*'), value, env));
      return new NormalCompletion(undefined);
    }
    default:
      throw new OutOfRange('Evaluate_ExportDeclaration', ExportDeclaration);
  }
}
