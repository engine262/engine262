import { Parser } from './parser/Parser.mjs';
import { surroundingAgent } from './engine.mjs';
import { ExportEntryRecord, SourceTextModuleRecord } from './modules.mjs';
import { Value } from './value.mjs';
/*
import {
  ModuleRequests_ModuleItemList,
  ImportEntries_ModuleItemList,
  ExportEntries_ModuleItemList,
  ImportedLocalNames,
} from './static-semantics/all.mjs';
*/
import { ValueSet } from './helpers.mjs';

function forwardError(fn) {
  try {
    return fn();
  } catch (e) {
    if (e.name === 'SyntaxError') {
      const v = surroundingAgent.Throw('SyntaxError', 'Raw', e.message).Value;
      return [v];
    } else {
      throw e;
    }
  }
}

export { Parser };

function parseMethodDefinition(sourceText) {
  const parser = new Parser(sourceText);
  return parser.scope({ superCall: true }, () => parser.parseMethodDefinition());
}
export const emptyConstructorNode = parseMethodDefinition('constructor() {}');
export const forwardingConstructorNode = parseMethodDefinition('constructor(...args) { super(...args); }');

export function ParseScript(sourceText, realm, hostDefined = {}) {
  const body = forwardError(() => {
    const parser = new Parser(sourceText);
    return parser.parseScript();
  });
  if (Array.isArray(body)) {
    return body;
  }

  return {
    Realm: realm,
    Environment: undefined,
    ECMAScriptCode: body,
    HostDefined: hostDefined,
    mark(m) {
      m(this.Realm);
      m(this.Environment);
    },
  };
}

export function ParseModule(sourceText, realm, hostDefined = {}) {
  // Assert: sourceText is an ECMAScript source text (see clause 10).
  const body = forwardError(() => {
    const parser = new Parser(sourceText);
    return parser.parseModule();
  });
  if (Array.isArray(body)) {
    return body;
  }

  const requestedModules = ModuleRequests_ModuleItemList(body.body);
  const importEntries = ImportEntries_ModuleItemList(body.body);
  const importedBoundNames = new ValueSet(ImportedLocalNames(importEntries));
  const indirectExportEntries = [];
  const localExportEntries = [];
  const starExportEntries = [];
  const exportEntries = ExportEntries_ModuleItemList(body.body);
  for (const ee of exportEntries) {
    if (ee.ModuleRequest === Value.null) {
      if (!importedBoundNames.has(ee.LocalName)) {
        localExportEntries.push(ee);
      } else {
        const ie = importEntries.find((e) => e.LocalName.stringValue() === ee.LocalName.stringValue());
        if (ie.ImportName.stringValue() === '*') {
          // Assert: This is a re-export of an imported module namespace object.
          localExportEntries.push(ee);
        } else {
          indirectExportEntries.push(new ExportEntryRecord({
            ModuleRequest: ie.ModuleRequest,
            ImportName: ie.ImportName,
            LocalName: Value.null,
            ExportName: ee.ExportName,
          }));
        }
      }
    } else if (ee.ImportName.stringValue() === '*') {
      starExportEntries.push(ee);
    } else {
      indirectExportEntries.push(ee);
    }
  }

  return new SourceTextModuleRecord({
    Realm: realm,
    Environment: Value.undefined,
    Namespace: Value.undefined,
    ImportMeta: undefined,
    Async: body.containsTopLevelAwait ? Value.true : Value.false,
    AsyncEvaluating: Value.false,
    TopLevelCapability: Value.undefined,
    AsyncParentModules: Value.undefined,
    PendingAsyncDependencies: Value.undefined,
    Status: 'unlinked',
    EvaluationError: Value.undefined,
    HostDefined: hostDefined,
    ECMAScriptCode: body,
    Context: undefined,
    RequestedModules: requestedModules,
    ImportEntries: importEntries,
    LocalExportEntries: localExportEntries,
    IndirectExportEntries: indirectExportEntries,
    StarExportEntries: starExportEntries,
    DFSIndex: Value.undefined,
    DFSAncestorIndex: Value.undefined,
  });
}

export function ParseRegExp(source, flags) {
}
