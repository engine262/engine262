import { Assert } from '../abstract-ops/notational-conventions.mjs';
import {
  isImportedDefaultBinding,
  isNameSpaceImport,
  isImportSpecifier,
} from '../ast.mjs';
import { OutOfRange } from '../helpers.mjs';
import { ImportEntryRecord, Value } from '../value.mjs';
import { BoundNames_ImportedBinding } from './BoundNames.mjs';

// 15.2.2.4 #sec-static-semantics-importentriesformodule
//   ImportClause :
//     ImportedDefaultBinding `,` NameSpaceImport
//     ImportedDefaultBinding `,` NamedImports
//
//   NamedImports : `{` `}`
//
//   ImportsList : ImportsList `,` ImportSpecifier
//
// (implicit)
//   ImportClause :
//     ImportedDefaultBinding
//     NameSpaceImport
//     NamedImports
//
//   NamedImports :
//     `{` ImportsList `}`
//     `{` ImportsList `,` `}`
//
//   ImportsList : ImportSpecifier
export function ImportEntriesForModule_ImportClause(ImportClause, module) {
  const entries = [];
  for (const binding of ImportClause) {
    switch (true) {
      case isImportedDefaultBinding(binding):
        entries.push(...ImportEntriesForModule_ImportedDefaultBinding(binding, module));
        break;

      case isNameSpaceImport(binding):
        entries.push(...ImportEntriesForModule_NameSpaceImport(binding, module));
        break;

      case isImportSpecifier(binding):
        entries.push(...ImportEntriesForModule_ImportSpecifier(binding, module));
        break;

      default:
        throw new OutOfRange('ImportEntriesForModule_ImportClause binding', binding);
    }
  }
  return entries;
}

// 15.2.2.4 #sec-static-semantics-importentriesformodule
//   ImportedDefaultBinding : ImportedBinding
export function ImportEntriesForModule_ImportedDefaultBinding(ImportedDefaultBinding, module) {
  const ImportedBinding = ImportedDefaultBinding.local;
  const localNames = BoundNames_ImportedBinding(ImportedBinding);
  Assert(localNames.length === 1);
  const [localName] = localNames;
  const defaultEntry = new ImportEntryRecord({
    ModuleRequest: module,
    ImportName: new Value('default'),
    LocalName: new Value(localName),
  });
  return [defaultEntry];
}

// 15.2.2.4 #sec-static-semantics-importentriesformodule
//   NameSpaceImport : `*` `as` ImportedBinding
export function ImportEntriesForModule_NameSpaceImport(NameSpaceImport, module) {
  const ImportedBinding = NameSpaceImport.local;
  const localNames = BoundNames_ImportedBinding(ImportedBinding);
  Assert(localNames.length === 1);
  const [localName] = localNames;
  const entry = new ImportEntryRecord({
    ModuleRequest: module,
    ImportName: new Value('*'),
    LocalName: new Value(localName),
  });
  return [entry];
}

// 15.2.2.4 #sec-static-semantics-importentriesformodule
//   ImportSpecifier :
//     ImportedBinding
//     IdentifierName `as` ImportedBinding
export function ImportEntriesForModule_ImportSpecifier(ImportSpecifier, module) {
  const {
    imported: IdentifierName,
    local: ImportedBinding,
  } = ImportSpecifier;

  const importName = IdentifierName.name;
  const localName = ImportedBinding.name;

  const entry = new ImportEntryRecord({
    ModuleRequest: module,
    ImportName: new Value(importName),
    LocalName: new Value(localName),
  });
  return [entry];
}
