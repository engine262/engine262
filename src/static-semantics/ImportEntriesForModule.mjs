import { Value } from '../value.mjs';
import { BoundNames, StringValue } from './all.mjs';

export function ImportEntriesForModule(ImportClause, module) {
  const entries = [];
  if (ImportClause.ImportedDefaultBinding) {
    const localName = BoundNames(ImportClause.ImportedDefaultBinding)[0];
    entries.push({
      ModuleRequest: module,
      ImportName: new Value('default'),
      LocalName: localName,
    });
  }
  if (ImportClause.NameSpaceImport) {
    const localName = BoundNames(ImportClause.NameSpaceImport)[0];
    entries.push({
      ModuleRequest: module,
      ImportName: new Value('*'),
      LocalName: localName,
    });
  }
  if (ImportClause.NamedImports) {
    for (const i of ImportClause.NamedImports) {
      if (i.type === 'ImportSpecifier') {
        const importName = StringValue(i.IdentifierName);
        const localName = StringValue(i.ImportedBinding);
        entries.push({
          ModuleRequest: module,
          ImportName: importName,
          LocalName: localName,
        });
      } else {
        const localName = BoundNames(i);
        entries.push({
          ModuleRequest: module,
          ImportName: localName,
          LocalName: localName,
        });
      }
    }
  }
  return entries;
}
