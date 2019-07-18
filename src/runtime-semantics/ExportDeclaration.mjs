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
import {
  BindingClassDeclarationEvaluation_ClassDeclaration,
  InitializeBoundName,
  NamedEvaluation_Expression,
} from './all.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
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

      const value = Q(yield* BindingClassDeclarationEvaluation_ClassDeclaration(ClassDeclaration));
      const className = BoundNames_ClassDeclaration(ClassDeclaration)[0];
      if (className === '*default*') {
        const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
        Q(InitializeBoundName(new Value('*default*'), value, env));
      }
      return new NormalCompletion(undefined);
    }
    case isExportDeclarationWithDefaultAndExpression(ExportDeclaration): {
      const AssignmentExpression = ExportDeclaration.declaration;

      let value;
      if (IsAnonymousFunctionDefinition(AssignmentExpression)) {
        value = yield* NamedEvaluation_Expression(AssignmentExpression, new Value('default'));
        ReturnIfAbrupt(value); // https://github.com/tc39/ecma262/issues/1605
      } else {
        const rhs = yield* Evaluate(AssignmentExpression);
        value = Q(GetValue(rhs));
      }
      const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      Q(InitializeBoundName(new Value('*default*'), value, env));
      return new NormalCompletion(undefined);
    }
    default:
      throw new OutOfRange('Evaluate_ExportDeclaration', ExportDeclaration);
  }
}
