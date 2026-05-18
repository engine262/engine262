import type { ParseNode } from '../parser/ParseNode.mts';
import { Value, type JSStringValue } from '../value.mts';
import type { Mutable } from '../utils/language.mts';
import { StringValue } from './all.mts';
import { MergeImportedNames, type LoadedModuleRequestRecord } from '#self';

// https://tc39.es/proposal-deferred-reexports/
export type ImportedNamesValue = 'all' | 'all-but-default' | readonly JSStringValue[];

// https://tc39.es/ecma262/#modulerequest-record
export interface ModuleRequestRecord {
  readonly Specifier: string;
  readonly Attributes: readonly ImportAttributeRecord[];
  readonly Phase: 'source' | 'defer' | 'evaluation';
  readonly ImportedNames: ImportedNamesValue;
}

// https://tc39.es/ecma262/#importattribute-record
export interface ImportAttributeRecord {
  readonly Key: string;
  readonly Value: string;
}

/** https://tc39.es/proposal-defer-import-eval/#sec-ModuleRequestsKeyEqual */
export function ModuleRequestsKeyEqual(left: ModuleRequestRecord | LoadedModuleRequestRecord, right: ModuleRequestRecord | LoadedModuleRequestRecord) {
  // 1. If left.[[Specifier]] is not right.[[Specifier]], return false.
  if (left.Specifier !== right.Specifier) {
    return false;
  }
  // 2. Let leftAttrs be left.[[Attributes]].
  const leftAttrs = left.Attributes;
  // 3. Let rightAttrs be right.[[Attributes]].
  const rightAttrs = right.Attributes;
  // 4. Let leftAttrsCount be the number of elements in leftAttrs.
  const leftAttrsCount = leftAttrs.length;
  // 5. Let rightAttrsCount be the number of elements in rightAttrs.
  const rightAttrsCount = rightAttrs.length;
  // 6. If leftAttrsCount ≠ rightAttrsCount, return false.
  if (leftAttrsCount !== rightAttrsCount) {
    return false;
  }
  // 7. For each ImportAttribute Record l of leftAttrs, do
  for (const l of leftAttrs) {
    // a. If rightAttrs does not contain an ImportAttribute Record r such that l.[[Key]] is r.[[Key]] and l.[[Value]] is r.[[Value]], return false.
    if (!rightAttrs.some((r) => l.Key === r.Key && l.Value === r.Value)) {
      return false;
    }
  }
  // 8. Return true.
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

// https://tc39.es/proposal-deferred-reexports/#sec-ImportedNames
function ImportedNames_FromImportClause(importClause: ParseNode.ImportClause | undefined): ImportedNamesValue {
  if (!importClause) {
    return [];
  }
  if (importClause.NameSpaceImport) {
    return 'all';
  }
  const names: JSStringValue[] = [];
  if (importClause.ImportedDefaultBinding) {
    names.push(Value('default'));
  }
  if (importClause.NamedImports) {
    for (const spec of importClause.NamedImports.ImportsList) {
      names.push(StringValue(spec.ModuleExportName ?? spec.ImportedBinding));
    }
  }
  return names;
}

// https://tc39.es/proposal-deferred-reexports/#sec-ImportedNames
function ImportedNames_FromExportFromClause(clause: ParseNode.ExportFromClauseLike): ImportedNamesValue {
  if (clause.type === 'ExportFromClause') {
    // export * from "m" -> ModuleExportName absent -> 'all-but-default'
    // export * as ns from "m" -> ModuleExportName present -> 'all'
    return clause.ModuleExportName ? 'all' : 'all-but-default';
  }
  // NamedExports (export { a, b as c } from "m")
  return clause.ExportsList.map((spec) => StringValue(spec.localName));
}

/** https://tc39.es/proposal-deferred-reexports/#sec-ExportFromDeclarationModuleRequest */
export function ExportFromDeclarationModuleRequest(node: ParseNode.ExportDeclaration_NamedFrom): ModuleRequestRecord {
  const specifier = StringValue(node.FromClause);
  const attributes = node.WithClause ? WithClauseToAttributes(node.WithClause) : [];
  const importedNames = ImportedNames_FromExportFromClause(node.ExportFromClause);
  return {
    Specifier: specifier.value, Attributes: attributes, Phase: 'evaluation', ImportedNames: importedNames,
  };
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
          const existing = requests.find((r) => ModuleRequestsKeyEqual(r, mr) && r.Phase === mr.Phase);
          if (existing) {
            (existing as Mutable<ModuleRequestRecord>).ImportedNames = MergeImportedNames(existing.ImportedNames, mr.ImportedNames);
          } else {
            requests.push(mr);
          }
        }
      }
      return requests;
    }
    case 'ImportDeclaration': {
      let specifier: JSStringValue;
      if (node.FromClause) {
        specifier = StringValue(node.FromClause);
      } else if (node.ModuleSpecifier) {
        specifier = StringValue(node.ModuleSpecifier);
      } else {
        throw new Error('Unreachable: all imports must have either an ImportClause or a ModuleSpecifier');
      }
      const attributes = node.WithClause ? WithClauseToAttributes(node.WithClause) : [];
      const importedNames = ImportedNames_FromImportClause(node.ImportClause);
      return [{
        Specifier: specifier.value, Attributes: attributes, Phase: node.Phase, ImportedNames: importedNames,
      }];
    }
    case 'ExportDeclaration':
      if (node.FromClause) {
        const fromNode = node as ParseNode.ExportDeclaration_NamedFrom;
        // `export defer ... from "m"` is tracked via [[OptionalIndirectExportEntries]]
        if (fromNode.Phase === 'defer') {
          return [];
        }
        return [ExportFromDeclarationModuleRequest(fromNode)];
      }
      return [];
    default:
      return [];
  }
}
