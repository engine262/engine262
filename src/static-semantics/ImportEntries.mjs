import { ImportEntriesForModule, ModuleRequests } from './all.mjs';

export function ImportEntries(node) {
  switch (node.type) {
    case 'Module':
      if (node.ModuleBody) {
        return ImportEntries(node.ModuleBody);
      }
      return [];
    case 'ModuleBody': {
      const entries = [];
      for (const item of node.ModuleItemList) {
        entries.push(...ImportEntries(item));
      }
      return entries;
    }
    case 'ImportDeclaration':
      if (node.FromClause) {
        const module = ModuleRequests(node.FromClause)[0];
        return ImportEntriesForModule(node.ImportClause, module);
      }
      return [];
    default:
      return [];
  }
}
