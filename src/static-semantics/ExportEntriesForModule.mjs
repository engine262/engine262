import { ExportEntryRecord } from '../modules.mjs';
import { Value } from '../value.mjs';

// 15.2.3.6 #sec-static-semantics-exportentriesformodule
//   ExportList : ExportList `,` ExportSpecifier
//
// (implicit)
//   ExportList : ExportSpecifier
export function ExportEntriesForModule_ExportList(ExportList, module) {
  const specs = [];
  for (const ExportSpecifier of ExportList) {
    specs.push(...ExportEntriesForModule_ExportSpecifier(ExportSpecifier, module));
  }
  return specs;
}

// 15.2.3.6 #sec-static-semantics-exportentriesformodule
//   ExportClause : `{` `}`
//
// (implicit)
//   ExportClause :
//     `{` ExportList `}`
//     `{` ExportList `,` `}`
export const ExportEntriesForModule_ExportClause = ExportEntriesForModule_ExportList;

// 15.2.3.6 #sec-static-semantics-exportentriesformodule
//   ExportSpecifier :
//     IdentifierName
//     IdentifierName `as` IdentifierName
export function ExportEntriesForModule_ExportSpecifier(ExportSpecifier, module) {
  const sourceName = new Value(ExportSpecifier.local.name);
  const exportName = new Value(ExportSpecifier.exported.name);
  let localName;
  let importName;
  if (module === Value.null) {
    localName = sourceName;
    importName = Value.null;
  } else {
    localName = Value.null;
    importName = sourceName;
  }
  return [new ExportEntryRecord({
    ModuleRequest: module,
    ImportName: importName,
    LocalName: localName,
    ExportName: exportName,
  })];
}
