import { Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';
import { StringValue } from './all.mjs';

export function ExportEntriesForModule(node, module) {
  if (Array.isArray(node)) {
    const specs = [];
    node.forEach((n) => {
      specs.push(...ExportEntriesForModule(n, module));
    });
    return specs;
  }
  switch (node.type) {
    case 'ExportFromClause':
      if (node.ModuleExportName) {
        // 1. Let exportName be the StringValue of ModuleExportName.
        const exportName = StringValue(node.ModuleExportName);
        // 2. Let entry be the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: ~all~, [[LocalName]]: null, [[ExportName]]: exportName }.
        const entry = {
          ModuleRequest: module,
          ImportName: 'all',
          LocalName: Value.null,
          ExportName: exportName,
        };
        // 3. Return a new List containing entry.
        return [entry];
      } else {
        // 1. Let entry be the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: ~all-but-default~, [[LocalName]]: null, [[ExportName]]: null }.
        const entry = {
          ModuleRequest: module,
          ImportName: 'all-but-default',
          LocalName: Value.null,
          ExportName: Value.null,
        };
        // 2. Return a new List containing entry.
        return [entry];
      }
    case 'ExportSpecifier': {
      const sourceName = StringValue(node.localName);
      const exportName = StringValue(node.exportName);
      let localName;
      let importName;
      if (module === Value.null) {
        localName = sourceName;
        importName = Value.null;
      } else { // 4. Else,
        localName = Value.null;
        importName = sourceName;
      }
      return [{
        ModuleRequest: module,
        ImportName: importName,
        LocalName: localName,
        ExportName: exportName,
      }];
    }
    case 'NamedExports':
      return ExportEntriesForModule(node.ExportsList, module);
    default:
      throw new OutOfRange('ExportEntriesForModule', node);
  }
}
