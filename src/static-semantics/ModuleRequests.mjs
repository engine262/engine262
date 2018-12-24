import {
  isExportDeclaration,
  isExportDeclarationWithDeclaration,
  isExportDeclarationWithDefaultAndClass,
  isExportDeclarationWithDefaultAndExpression,
  isExportDeclarationWithDefaultAndHoistable,
  isExportDeclarationWithExport,
  isExportDeclarationWithExportAndFrom,
  isExportDeclarationWithStar,
  isExportDeclarationWithVariable,
  isImportDeclaration,
  isStatementListItem,
} from '../ast.mjs';
import { Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

// 15.2.1.10 #sec-module-semantics-static-semantics-modulerequests
//   ModuleItemList : ModuleItemList ModuleItem
//
// (implicit)
//   ModuleItemList : ModuleItem
export function ModuleRequests_ModuleItemList(ModuleItemList) {
  const moduleNames = new Set();
  for (const ModuleItem of ModuleItemList) {
    for (const additionalName of ModuleRequests_ModuleItem(ModuleItem)) {
      moduleNames.add(additionalName);
    }
  }
  return [...moduleNames];
}

// (implicit)
//   ModuleBody : ModuleItemList
export const ModuleRequests_ModuleBody = ModuleRequests_ModuleItemList;

// 15.2.1.10 #sec-module-semantics-static-semantics-modulerequests
//   Module : [empty]
//
// (implicit)
//   Module : ModuleBody
export const ModuleRequests_Module = ModuleRequests_ModuleBody;

// 15.2.1.10 #sec-module-semantics-static-semantics-modulerequests
//   ModuleItem : StatementListItem
//
// (implicit)
//   ModuleItem : ImportDeclaration
//   ModuleItem : ExportDeclaration
export function ModuleRequests_ModuleItem(ModuleItem) {
  switch (true) {
    case isStatementListItem(ModuleItem):
      return [];

    case isImportDeclaration(ModuleItem):
      return ModuleRequests_ImportDeclaration(ModuleItem);

    case isExportDeclaration(ModuleItem):
      return ModuleRequests_ExportDeclaration(ModuleItem);

    default:
      throw new OutOfRange('ModuleRequests_ModuleItem', ModuleItem);
  }
}

// 15.2.2.5 #sec-imports-static-semantics-modulerequests
//   ImportDeclaration : `import` ImportClause FromClause `;`
export function ModuleRequests_ImportDeclaration(ImportDeclaration) {
  const { source: FromClause } = ImportDeclaration;
  return ModuleRequests_FromClause(FromClause);
}

// 15.2.2.5 #sec-imports-static-semantics-modulerequests
//   ModuleSpecifier : StringLiteral
//
// (implicit)
//   FromClause : `from` ModuleSpecifier
export function ModuleRequests_FromClause(FromClause) {
  return [new Value(FromClause.value)];
}

// 15.2.3.9 #sec-exports-static-semantics-modulerequests
//   ExportDeclaration :
//     `export` `*` FromClause `;`
//     `export` ExportClause FromClause `;`
//     `export` ExportClause `;`
//     `export` VariableStatement
//     `export` Declaration
//     `export` `default` HoistableDeclaration
//     `export` `default` ClassDeclaration
//     `export` `default` AssignmentExpression `;`
export function ModuleRequests_ExportDeclaration(ExportDeclaration) {
  switch (true) {
    case isExportDeclarationWithStar(ExportDeclaration):
    case isExportDeclarationWithExportAndFrom(ExportDeclaration):
      return ModuleRequests_FromClause(ExportDeclaration.source);

    case isExportDeclarationWithExport(ExportDeclaration):
    case isExportDeclarationWithVariable(ExportDeclaration):
    case isExportDeclarationWithDeclaration(ExportDeclaration):
    case isExportDeclarationWithDefaultAndHoistable(ExportDeclaration):
    case isExportDeclarationWithDefaultAndClass(ExportDeclaration):
    case isExportDeclarationWithDefaultAndExpression(ExportDeclaration):
      return [];

    default:
      throw new OutOfRange('ModuleRequests_ExportDeclaration', ExportDeclaration);
  }
}
