import type { ParseNode } from '../parser/ParseNode.mjs';
import type { JSStringValue, NullValue } from '../value.mjs';
import { ImportEntriesForModule, ModuleRequests } from './all.mjs';

export function ImportEntries(node: ParseNode): ImportEntry[] {
  switch (node.type) {
    case 'Module':
      if (node.ModuleBody) {
        return ImportEntries(node.ModuleBody);
      }
      return [];
    case 'ModuleBody': {
      const entries: ImportEntry[] = [];
      for (const item of node.ModuleItemList) {
        entries.push(...ImportEntries(item));
      }
      return entries;
    }
    case 'ImportDeclaration':
      if (node.FromClause) {
        // 1. Let module be the sole element of ModuleRequests of FromClause.
        const module = ModuleRequests(node.FromClause)[0];
        // 2. Return ImportEntriesForModule of ImportClause with argument module.
        return ImportEntriesForModule(node.ImportClause!, module);
      }
      return [];
    default:
      return [];
  }
}

export interface ImportEntry {
  readonly ModuleRequest: JSStringValue | NullValue;
  readonly ImportName: JSStringValue | 'namespace-object';
  readonly LocalName: JSStringValue;
}
