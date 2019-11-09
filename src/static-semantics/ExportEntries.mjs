import { Assert } from '../abstract-ops/notational-conventions.mjs';
import {
  isExportDeclaration,
  isExportDeclarationWithStar,
  isExportDeclarationWithExportAndFrom,
  isExportDeclarationWithExport,
  isExportDeclarationWithVariable,
  isExportDeclarationWithDeclaration,
  isExportDeclarationWithDefaultAndHoistable,
  isExportDeclarationWithDefaultAndClass,
  isExportDeclarationWithDefaultAndExpression,
  isImportDeclaration,
  isStatementListItem,
} from '../ast.mjs';
import { OutOfRange } from '../helpers.mjs';
import { ExportEntryRecord } from '../modules.mjs';
import { Value } from '../value.mjs';
import {
  BoundNames_ClassDeclaration,
  BoundNames_Declaration,
  BoundNames_HoistableDeclaration,
  BoundNames_VariableStatement,
} from './BoundNames.mjs';
import { ExportEntriesForModule_ExportClause } from './ExportEntriesForModule.mjs';
import { ModuleRequests_FromClause } from './ModuleRequests.mjs';

// 15.2.1.7 #sec-module-semantics-static-semantics-exportentries
//   ModuleItemList : ModuleItemList ModuleItem
//
// (implicit)
//   ModuleItemList : ModuleItem
export function ExportEntries_ModuleItemList(ModuleItemList) {
  const entries = [];
  for (const ModuleItem of ModuleItemList) {
    entries.push(...ExportEntries_ModuleItem(ModuleItem));
  }
  return entries;
}

// (implicit)
//   ModuleBody : ModuleItemList
export const ExportEntries_ModuleBody = ExportEntries_ModuleItemList;

// 15.2.1.7 #sec-module-semantics-static-semantics-exportentries
//   Module : [empty]
//
// (implicit)
//   Module : ModuleBody
export const ExportEntries_Module = ExportEntries_ModuleBody;

// 15.2.1.7 #sec-module-semantics-static-semantics-exportentries
//   ModuleItem :
//     ImportDeclaration
//     StatementListItem
//
// (implicit)
//   ModuleItem : ExportDeclaration
export function ExportEntries_ModuleItem(ModuleItem) {
  switch (true) {
    case isImportDeclaration(ModuleItem):
    case isStatementListItem(ModuleItem):
      return [];

    case isExportDeclaration(ModuleItem):
      return ExportEntries_ExportDeclaration(ModuleItem);

    default:
      throw new OutOfRange('ExportEntries_ModuleItem', ModuleItem);
  }
}

// 15.2.3.5 #sec-exports-static-semantics-exportentries
//   ExportDeclaration :
//     `export` `*` FromClause `;`
//     `export` ExportClause FromClause `;`
//     `export` ExportClause `;`
//     `export` VariableStatement
//     `export` Declaration
//     `export` `default` HoistableDeclaration
//     `export` `default` ClassDeclaration
//     `export` `default` AssignmentExpression `;`
export function ExportEntries_ExportDeclaration(ExportDeclaration) {
  switch (true) {
    case isExportDeclarationWithStar(ExportDeclaration): {
      const FromClause = ExportDeclaration.source;
      const modules = ModuleRequests_FromClause(FromClause);
      Assert(modules.length === 1);
      const [module] = modules;
      const entry = new ExportEntryRecord({
        ModuleRequest: module,
        ImportName: new Value('*'),
        LocalName: Value.null,
        ExportName: Value.null,
      });
      return [entry];
    }

    case isExportDeclarationWithExportAndFrom(ExportDeclaration): {
      const {
        specifiers: ExportClause,
        source: FromClause,
      } = ExportDeclaration;
      const modules = ModuleRequests_FromClause(FromClause);
      Assert(modules.length === 1);
      const [module] = modules;
      return ExportEntriesForModule_ExportClause(ExportClause, module);
    }

    case isExportDeclarationWithExport(ExportDeclaration): {
      const ExportClause = ExportDeclaration.specifiers;
      return ExportEntriesForModule_ExportClause(ExportClause, Value.null);
    }

    case isExportDeclarationWithVariable(ExportDeclaration): {
      const VariableStatement = ExportDeclaration.declaration;
      const entries = [];
      const names = BoundNames_VariableStatement(VariableStatement);
      for (const name of names) {
        entries.push(new ExportEntryRecord({
          ModuleRequest: Value.null,
          ImportName: Value.null,
          LocalName: new Value(name),
          ExportName: new Value(name),
        }));
      }
      return entries;
    }

    case isExportDeclarationWithDeclaration(ExportDeclaration): {
      const Declaration = ExportDeclaration.declaration;
      const entries = [];
      const names = BoundNames_Declaration(Declaration);
      for (const name of names) {
        entries.push(new ExportEntryRecord({
          ModuleRequest: Value.null,
          ImportName: Value.null,
          LocalName: new Value(name),
          ExportName: new Value(name),
        }));
      }
      return entries;
    }

    case isExportDeclarationWithDefaultAndHoistable(ExportDeclaration): {
      const HoistableDeclaration = ExportDeclaration.declaration;
      const names = BoundNames_HoistableDeclaration(HoistableDeclaration);
      Assert(names.length === 1);
      const [localName] = names;
      return [new ExportEntryRecord({
        ModuleRequest: Value.null,
        ImportName: Value.null,
        LocalName: new Value(localName),
        ExportName: new Value('default'),
      })];
    }

    case isExportDeclarationWithDefaultAndClass(ExportDeclaration): {
      const ClassDeclaration = ExportDeclaration.declaration;
      const names = BoundNames_ClassDeclaration(ClassDeclaration);
      Assert(names.length === 1);
      const [localName] = names;
      return [new ExportEntryRecord({
        ModuleRequest: Value.null,
        ImportName: Value.null,
        LocalName: new Value(localName),
        ExportName: new Value('default'),
      })];
    }

    case isExportDeclarationWithDefaultAndExpression(ExportDeclaration):
      return [new ExportEntryRecord({
        ModuleRequest: Value.null,
        ImportName: Value.null,
        LocalName: new Value('*default*'),
        ExportName: new Value('default'),
      })];

    default:
      throw new OutOfRange('ExportEntries_ExportDeclaration', ExportDeclaration);
  }
}
