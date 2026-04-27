import type { ParseNode } from '../parser/ParseNode.mts';
import { StringValue } from './all.mts';
import { type LoadedModuleRequestRecord } from '#self';

// https://tc39.es/ecma262/#modulerequest-record
export interface ModuleRequestRecord {
  readonly Specifier: string;
  readonly Attributes: readonly ImportAttributeRecord[];
  readonly Phase: 'defer' | 'evaluation';
}

// https://tc39.es/ecma262/#importattribute-record
export interface ImportAttributeRecord {
  readonly Key: string;
  readonly Value: string;
}

// https://tc39.es/ecma262/#sec-ModuleRequestsEqual
export function ModuleRequestsEqual(left: ModuleRequestRecord | LoadedModuleRequestRecord, right: ModuleRequestRecord | LoadedModuleRequestRecord) {
  if (left.Specifier !== right.Specifier) {
    return false;
  }
  const leftAttrs = left.Attributes;
  const rightAttrs = right.Attributes;
  const leftAttrsCount = leftAttrs.length;
  const rightAttrsCount = rightAttrs.length;
  if (leftAttrsCount !== rightAttrsCount) {
    return false;
  }
  for (const l of leftAttrs) {
    if (!rightAttrs.some((r) => l.Key === r.Key && l.Value === r.Value)) {
      return false;
    }
  }
  return true;
}

// https://tc39.es/ecma262/#sec-withclausetoattributes
function WithClauseToAttributes(node: ParseNode.WithClause): ImportAttributeRecord[] {
  const attributes: ImportAttributeRecord[] = [];
  for (const attribute of node.WithEntries) {
    attributes.push({
      Key: StringValue(attribute.AttributeKey).value,
      Value: StringValue(attribute.AttributeValue).value,
    });
  }
  attributes.sort((a, b) => (a.Key < b.Key ? -1 : 1));
  return attributes;
}

export function ModuleRequests(node: ParseNode): ModuleRequestRecord[] {
  switch (node.type) {
    case 'Module':
      if (node.ModuleBody) {
        return ModuleRequests(node.ModuleBody);
      }
      return [];
    case 'ModuleBody': {
      const requests: ModuleRequestRecord[] = [];
      for (const item of node.ModuleItemList) {
        const additionalRequests = ModuleRequests(item);
        for (const mr of additionalRequests) {
          if (!requests.some((r) => ModuleRequestsEqual(r, mr) && r.Phase === mr.Phase)
          ) {
            requests.push(mr);
          }
        }
      }
      return requests;
    }
    case 'ImportDeclaration':
      if (node.FromClause) {
        const specifier = StringValue(node.FromClause);
        const attributes = node.WithClause ? WithClauseToAttributes(node.WithClause) : [];
        return [{ Specifier: specifier.value, Attributes: attributes, Phase: node.Phase }];
      }
      if (node.ModuleSpecifier) {
        const specifier = StringValue(node.ModuleSpecifier);
        const attributes = node.WithClause ? WithClauseToAttributes(node.WithClause) : [];
        return [{ Specifier: specifier.value, Attributes: attributes, Phase: node.Phase }];
      }
      throw new Error('Unreachable: all imports must have either an ImportClause or a ModuleSpecifier');
    case 'ExportDeclaration':
      if (node.FromClause) {
        const specifier = StringValue(node.FromClause);
        const attributes = node.WithClause ? WithClauseToAttributes(node.WithClause) : [];
        return [{ Specifier: specifier.value, Attributes: attributes, Phase: 'evaluation' }];
      }
      return [];
    default:
      return [];
  }
}
