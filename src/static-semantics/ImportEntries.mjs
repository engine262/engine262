import { Assert } from '../abstract-ops/notational-conventions.mjs';
import {
  isExportDeclaration,
  isImportDeclaration,
  isImportDeclarationWithClause,
  isImportDeclarationWithSpecifierOnly,
  isStatementListItem,
} from '../ast.mjs';
import { OutOfRange } from '../helpers.mjs';
import { ImportEntriesForModule_ImportClause } from './ImportEntriesForModule.mjs';
import { ModuleRequests_FromClause } from './ModuleRequests.mjs';

// 15.2.1.8 #sec-module-semantics-static-semantics-importentries
//   ModuleItemList : ModuleItemList ModuleItem
//
// (implicit)
//   ModuleItemList : ModuleItem
export function ImportEntries_ModuleItemList(ModuleItemList) {
  const entries = [];
  for (const ModuleItem of ModuleItemList) {
    entries.push(...ImportEntries_ModuleItem(ModuleItem));
  }
  return entries;
}

// (implicit)
//   ModuleBody : ModuleItemList
export const ImportEntries_ModuleBody = ImportEntries_ModuleItemList;

// 15.2.1.8 #sec-module-semantics-static-semantics-importentries
//   Module : [empty]
//
// (implicit)
//   Module : ModuleBody
export const ImportEntries_Module = ImportEntries_ModuleBody;

// 15.2.1.8 #sec-module-semantics-static-semantics-importentries
//   ModuleItem :
//     ExportDeclaration
//     StatementListItem
//
// (implicit)
//   ModuleItem : ImportDeclaration
export function ImportEntries_ModuleItem(ModuleItem) {
  switch (true) {
    case isExportDeclaration(ModuleItem):
    case isStatementListItem(ModuleItem):
      return [];

    case isImportDeclaration(ModuleItem):
      return ImportEntries_ImportDeclaration(ModuleItem);

    default:
      throw new OutOfRange('ImportEntries_ModuleItem', ModuleItem);
  }
}

// 15.2.2.3 #sec-imports-static-semantics-importentries
//   ImportDeclaration :
//     `import` ImportClause FromClause `;`
//     `import` ModuleSpecifier `;`
export function ImportEntries_ImportDeclaration(ImportDeclaration) {
  switch (true) {
    case isImportDeclarationWithClause(ImportDeclaration): {
      const {
        specifiers: ImportClause,
        source: FromClause,
      } = ImportDeclaration;
      const reqs = ModuleRequests_FromClause(FromClause);
      Assert(reqs.length === 1);
      const [module] = reqs;
      return ImportEntriesForModule_ImportClause(ImportClause, module);
    }

    case isImportDeclarationWithSpecifierOnly(ImportDeclaration):
      return [];

    default:
      throw new OutOfRange('ImportEntries_ImportDeclaration', ImportDeclaration);
  }
}
