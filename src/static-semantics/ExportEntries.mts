import { JSStringValue, NullValue, Value } from '../value.mts';
import { OutOfRange, isArray } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { BoundNames, ModuleRequests, ExportEntriesForModule } from './all.mts';

export function ExportEntries(node: ParseNode | readonly ParseNode[]): ExportEntry[] {
  if (isArray(node)) {
    const entries: ExportEntry[] = [];
    node.forEach((n) => {
      entries.push(...ExportEntries(n));
    });
    return entries;
  }
  switch (node.type) {
    case 'Module':
      if (!node.ModuleBody) {
        return [];
      }
      return ExportEntries(node.ModuleBody);
    case 'ModuleBody':
      return ExportEntries(node.ModuleItemList);
    case 'ExportDeclaration':
      switch (true) {
        case !!node.ExportFromClause && !!node.FromClause: {
          // `export` ExportFromClause FromClause `;`
          // 1. Let module be the sole element of ModuleRequests of FromClause.
          const module = ModuleRequests(node.FromClause!)[0];
          // 2. Return ExportEntriesForModule(ExportFromClause, module).
          return ExportEntriesForModule(node.ExportFromClause!, module);
        }
        case !!node.NamedExports: {
          // `export` NamedExports `;`
          // 1. Return ExportEntriesForModule(NamedExports, null).
          return ExportEntriesForModule(node.NamedExports!, Value.null);
        }
        case !!node.VariableStatement: {
          // `export` VariableStatement
          // 1. Let entries be a new empty List.
          const entries = [];
          // 2. Let names be the BoundNames of VariableStatement.
          const names = BoundNames(node.VariableStatement!);
          // 3. For each name in names, do
          for (const name of names) {
            // a. Append the ExportEntry Record { [[ModuleRequest]]: null, [[ImportName]]: null, [[LocalName]]: name, [[ExportName]]: name } to entries.
            entries.push({
              ModuleRequest: Value.null,
              ImportName: Value.null,
              LocalName: name,
              ExportName: name,
            });
          }
          // 4. Return entries.
          return entries;
        }
        case !!node.Declaration: {
          // `export` Declaration
          // 1. Let entries be a new empty List.
          const entries: ExportEntry[] = [];
          // 2. Let names be the BoundNames of Declaration.
          const names = BoundNames(node.Declaration!);
          // 3. For each name in names, do
          for (const name of names) {
            // a. Append the ExportEntry Record { [[ModuleRequest]]: null, [[ImportName]]: null, [[LocalName]]: name, [[ExportName]]: name } to entries.
            entries.push({
              ModuleRequest: Value.null,
              ImportName: Value.null,
              LocalName: name,
              ExportName: name,
            });
          }
          // 4. Return entries.
          return entries;
        }
        case node.default && !!node.HoistableDeclaration: {
          // `export` `default` HoistableDeclaration
          // 1. Let names be BoundNames of HoistableDeclaration.
          const names = BoundNames(node.HoistableDeclaration!);
          // 2. Let localName be the sole element of names.
          const localName = names[0];
          // 3. Return a new List containing the ExportEntry Record { [[ModuleRequest]]: null, [[ImportName]]: null, [[LocalName]]: localName, [[ExportName]]: "default" }.
          return [{
            ModuleRequest: Value.null,
            ImportName: Value.null,
            LocalName: localName,
            ExportName: Value('default'),
          }];
        }
        case node.default && !!node.ClassDeclaration: {
          // `export` `default` ClassDeclaration
          // 1. Let names be BoundNames of ClassDeclaration.
          const names = BoundNames(node.ClassDeclaration!);
          // 2. Let localName be the sole element of names.
          const localName = names[0];
          // 3. Return a new List containing the ExportEntry Record { [[ModuleRequest]]: null, [[ImportName]]: null, [[LocalName]]: localName, [[ExportName]]: "default" }.
          return [{
            ModuleRequest: Value.null,
            ImportName: Value.null,
            LocalName: localName,
            ExportName: Value('default'),
          }];
        }
        case node.default && !!node.AssignmentExpression: {
          // `export` `default` AssignmentExpression `;`
          // 1. Let entry be the ExportEntry Record { [[ModuleRequest]]: null, [[ImportName]]: null, [[LocalName]]: "*default*", [[ExportName]]: "default" }.
          const entry = {
            ModuleRequest: Value.null,
            ImportName: Value.null,
            LocalName: Value('*default*'),
            ExportName: Value('default'),
          };
          // 2. Return a new List containing entry.
          return [entry];
        }
        default:
          throw new OutOfRange('ExportEntries', node);
      }
    default:
      return [];
  }
}

export interface ExportEntry {
  readonly ModuleRequest: JSStringValue | NullValue;
  readonly ImportName: JSStringValue | NullValue | 'all' | 'all-but-default';
  readonly LocalName: JSStringValue | NullValue;
  readonly ExportName: JSStringValue | NullValue;
}
