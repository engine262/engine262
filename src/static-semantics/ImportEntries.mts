import type { ParseNode } from '../parser/ParseNode.mts';
import type { JSStringValue } from '../value.mts';
import { ImportEntriesForModule, ModuleRequests, type ModuleRequestRecord } from './all.mts';

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
        const module = ModuleRequests(node)[0];
        // 2. Return ImportEntriesForModule of ImportClause with argument module.
        return ImportEntriesForModule(node.ImportClause!, module);
      }
      return [];
    default:
      return [];
  }
}

export interface ImportEntry {
  readonly ModuleRequest: ModuleRequestRecord;
  readonly ImportName: JSStringValue | 'namespace-object';
  readonly LocalName: JSStringValue;
}
