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
      if (node.IdentifierName) {
        // 1. Let exportName be the StringValue of IdentifierName.
        const exportName = StringValue(node.IdentifierName);
        // 2. Let entry be the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: ~star~, [[LocalName]]: null, [[ExportName]]: exportName }.
        const entry = {
          ModuleRequest: module,
          ImportName: 'star',
          LocalName: Value.null,
          ExportName: exportName,
        };
        // 3. Return a new List containing entry.
        return [entry];
      } else if (node.ModuleExportName) {
        // 1. Let exportName be the StringValue of ModuleExportName.
        const exportName = StringValue(node.ModuleExportName);
        // 2. Let entry be the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: ~star~, [[LocalName]]: null, [[ExportName]]: exportName }.
        const entry = {
          ModuleRequest: module,
          ImportName: 'star',
          LocalName: Value.null,
          ExportName: exportName,
        };
        // 3. Return a new List containing entry.
        return [entry];
      } else {
        // 1. Let entry be the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: ~star~, [[LocalName]]: null, [[ExportName]]: null }.
        const entry = {
          ModuleRequest: module,
          ImportName: 'star',
          LocalName: Value.null,
          ExportName: Value.null,
        };
        // 2. Return a new List containing entry.
        return [entry];
      }
    case 'ExportSpecifier':
      switch (true) {
        case !!node.IdentifierName && !!node.ModuleExportName: {
          // 1. Let sourceName be the StringValue of IdentifierName.
          const sourceName = StringValue(node.IdentifierName);
          // 2. Let exportName be the StringValue of ModuleExportName.
          const exportName = StringValue(node.ModuleExportName);
          let localName;
          let importName;
          // 3. If module is null, then
          if (module === Value.null) {
            localName = sourceName;
            importName = Value.null;
          } else { // 4. Else,
            localName = Value.null;
            importName = sourceName;
          }
          // 5. Return a new List containing the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: importName, [[LocalName]]: localName, [[ExportName]]: exportName }.
          return [{
            ModuleRequest: module,
            ImportName: importName,
            LocalName: localName,
            ExportName: exportName,
          }];
        }
        case !!node.IdentifierName: {
          // 1. Let sourceName be the StringValue of IdentifierName.
          const sourceName = StringValue(node.IdentifierName);
          let localName;
          let importName;
          // 2. If module is null, then
          if (module === Value.null) {
            // a. Let localName be sourceName.
            localName = sourceName;
            // b. Let importName be null.
            importName = Value.null;
          } else { // 3. Else,
            // a. Let localName be null.
            localName = Value.null;
            // b. Let importName be sourceName.
            importName = sourceName;
          }
          // 4. Return a new List containing the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: importName, [[LocalName]]: localName, [[ExportName]]: sourceName }.
          return [{
            ModuleRequest: module,
            ImportName: importName,
            LocalName: localName,
            ExportName: sourceName,
          }];
        }
        case !!node.IdentifierName_a && !!node.IdentifierName_b: {
          // 1. Let sourceName be the StringValue of the first IdentifierName.
          const sourceName = StringValue(node.IdentifierName_a);
          // 2. Let exportName be the StringValue of the second IdentifierName.
          const exportName = StringValue(node.IdentifierName_b);
          let localName;
          let importName;
          // 3. If module is null, then
          if (module === Value.null) {
            localName = sourceName;
            importName = Value.null;
          } else { // 4. Else,
            localName = Value.null;
            importName = sourceName;
          }
          // 5. Return a new List containing the ExportEntry Record { [[ModuleRequest]]: module, [[ImportName]]: importName, [[LocalName]]: localName, [[ExportName]]: exportName }.
          return [{
            ModuleRequest: module,
            ImportName: importName,
            LocalName: localName,
            ExportName: exportName,
          }];
        }
        default:
          throw new OutOfRange('ExportEntriesForModule', node);
      }
    case 'NamedExports':
      return ExportEntriesForModule(node.ExportsList, module);
    default:
      throw new OutOfRange('ExportEntriesForModule', node);
  }
}
