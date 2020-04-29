import { ModuleRequests, BoundNames } from './all.mjs';

function ExportEntriesForModule(node, module) {
  return [];
}

export function ExportEntries(node) {
  if (Array.isArray(node)) {
    const entries = [];
    for (const item of node) {
      entries.push(...ExportEntries(item));
    }
    return entries;
  }
  switch (node.type) {
    case 'Module':
      if (node.ModuleBody) {
        return ExportEntries(node.ModuleBody);
      }
      return [];
    case 'ModuleBody':
      return ExportEntries(node.ModuleItemList);
    case 'ExportDeclaration': {
      if (node.NamedExports) {
        return ExportEntriesForModule(node.NamedExports, null);
      }
      if (node.VariableStatement) {
        const entries = [];
        const names = BoundNames(node.VariableStatement);
        for (const name of names) {
          entries.push({
            ModuleRequest: null,
            ImportName: null,
            LocalName: name,
            ExportName: name,
          });
        }
        return entries;
      }
      if (node.ExportFromClause) {
        const module = ModuleRequests(node.FromClause)[0];
        return ExportEntriesForModule(node.ExportFromClause, module);
      }
      return [];
    }
    default:
      return [];
  }
}
