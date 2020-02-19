import { Parser } from './parser/Parser.mjs';
import { surroundingAgent } from './engine.mjs';
import { ExportEntryRecord, SourceTextModuleRecord } from './modules.mjs';
import { Value } from './value.mjs';
import { Get, Set } from './abstract-ops/all.mjs';
import { X } from './completion.mjs';
import {
  ModuleRequests,
  ImportEntries,
  ExportEntries,
  ImportedLocalNames,
} from './static-semantics/all.mjs';
import { ValueSet } from './helpers.mjs';

export function forwardError(fn) {
  try {
    return fn();
  } catch (e) {
    if (e.name === 'SyntaxError') {
      const v = surroundingAgent.Throw('SyntaxError', 'Raw', e.message).Value;
      const stackString = new Value('stack');
      const stack = X(Get(v, stackString)).stringValue();
      const newStackString = `${e.decoration}\n${stack}`;
      X(Set(v, stackString, new Value(newStackString), Value.true));
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
  // 1. Assert: sourceText is an ECMAScript source text (see clause 10).
  // 2. Parse sourceText using Script as the goal symbol and analyse the parse result for
  //    any Early Error conditions. If the parse was successful and no early errors were found,
  //    let body be the resulting parse tree. Otherwise, let body be a List of one or more
  //    SyntaxError objects representing the parsing errors and/or early errors. Parsing and
  //    early error detection may be interweaved in an implementation-dependent manner. If more
  //    than one parsing error or early error is present, the number and ordering of error
  //    objects in the list is implementation-dependent, but at least one must be present.
  const body = forwardError(() => {
    const parser = new Parser(sourceText);
    return parser.parseScript();
  });
  // 3. If body is a List of errors, return body.
  if (Array.isArray(body)) {
    return body;
  }
  // 4. Return Script Record { [[Realm]]: realm, [[Environment]]: undefined, [[ECMAScriptCode]]: body, [[HostDefined]]: hostDefined }.
  return {
    Realm: realm,
    Environment: Value.undefined,
    ECMAScriptCode: body,
    HostDefined: hostDefined,
    mark(m) {
      m(this.Realm);
      m(this.Environment);
    },
  };
}

export function ParseModule(sourceText, realm, hostDefined = {}) {
  // 1. Assert: sourceText is an ECMAScript source text (see clause 10).
  // 2. Parse sourceText using Module as the goal symbol and analyse the parse result for
  //    any Early Error conditions. If the parse was successful and no early errors were found,
  //    let body be the resulting parse tree. Otherwise, let body be a List of one or more
  //    SyntaxError objects representing the parsing errors and/or early errors. Parsing and
  //    early error detection may be interweaved in an implementation-dependent manner. If more
  //    than one parsing error or early error is present, the number and ordering of error
  //    objects in the list is implementation-dependent, but at least one must be present.
  const body = forwardError(() => {
    const parser = new Parser(sourceText);
    return parser.parseModule();
  });
  // 3. If body is a List of errors, return body.
  if (Array.isArray(body)) {
    return body;
  }
  // 4. Let requestedModules be the ModuleRequests of body.
  const requestedModules = ModuleRequests(body);
  // 5. Let importEntries be ImportEntries of body.
  const importEntries = ImportEntries(body);
  // 6. Let importedBoundNames be ImportedLocalNames(importEntries).
  const importedBoundNames = new ValueSet(ImportedLocalNames(importEntries));
  // 7. Let indirectExportEntries be a new empty List.
  const indirectExportEntries = [];
  // 8. Let localExportEntries be a new empty List.
  const localExportEntries = [];
  // 9. Let starExportEntries be a new empty List.
  const starExportEntries = [];
  // 10. Let exportEntries be ExportEntries of body.
  const exportEntries = ExportEntries(body.body);
  // 11. For each ExportEntry Record ee in exportEntries, do
  for (const ee of exportEntries) {
    // a. If ee.[[ModuleRequest]] is null, then
    if (ee.ModuleRequest === Value.null) {
      // i. If ee.[[LocalName]] is not an element of importedBoundNames, then
      if (!importedBoundNames.has(ee.LocalName)) {
        // 1. If ee.[[LocalName]] is not an element of importedBoundNames, then
        localExportEntries.push(ee);
      } else { // ii. Else,
        // 1. Let ie be the element of importEntries whose [[LocalName]] is the same as ee.[[LocalName]].
        const ie = importEntries.find((e) => e.LocalName.stringValue() === ee.LocalName.stringValue());
        // 2. If ie.[[ImportName]] is "*", then
        if (ie.ImportName.stringValue() === '*') {
          // a. NOTE: This is a re-export of an imported module namespace object.
          // b. Append ee to localExportEntries.
          localExportEntries.push(ee);
        } else { // 3. Else,
          // a. NOTE: This is a re-export of a single name.
          // b. Append the ExportEntry Record { [[ModuleRequest]]: ie.[[ModuleRequest]], [[ImportName]]: ie.[[ImportName]], [[LocalName]]: null, [[ExportName]]: ee.[[ExportName]] } to indirectExportEntries.
          indirectExportEntries.push(new ExportEntryRecord({
            ModuleRequest: ie.ModuleRequest,
            ImportName: ie.ImportName,
            LocalName: Value.null,
            ExportName: ee.ExportName,
          }));
        }
      }
    } else if (ee.ImportName.stringValue() === '*') { // b. Else if ee.[[ImportName]] is "*" and ee.[[ExportName]] is null, then
      // i. Append ee to starExportEntries.
      starExportEntries.push(ee);
    } else { // c. Else,
      // i. Append ee to indirectExportEntries.
      indirectExportEntries.push(ee);
    }
  }
  // 12. Return Source Text Module Record { [[Realm]]: realm, [[Environment]]: undefined, [[Namespace]]: undefined, [[Status]]: unlinked, [[EvaluationError]]: undefined, [[HostDefined]]: hostDefined, [[ECMAScriptCode]]: body, [[Context]]: empty, [[ImportMeta]]: empty, [[RequestedModules]]: requestedModules, [[ImportEntries]]: importEntries, [[LocalExportEntries]]: localExportEntries, [[IndirectExportEntries]]: indirectExportEntries, [[StarExportEntries]]: starExportEntries, [[DFSIndex]]: undefined, [[DFSAncestorIndex]]: undefined }.
  return new SourceTextModuleRecord({
    Realm: realm,
    Environment: Value.undefined,
    Namespace: Value.undefined,
    Status: 'unlinked',
    EvaluationError: Value.undefined,
    HostDefined: hostDefined,
    ECMAScriptCode: body,
    Context: undefined,
    ImportMeta: undefined,
    RequestedModules: requestedModules,
    ImportEntries: importEntries,
    LocalExportEntries: localExportEntries,
    IndirectExportEntries: indirectExportEntries,
    StarExportEntries: starExportEntries,
    DFSIndex: Value.undefined,
    DFSAncestorIndex: Value.undefined,

    Async: body.containsTopLevelAwait ? Value.true : Value.false,
    AsyncEvaluating: Value.false,
    TopLevelCapability: Value.undefined,
    AsyncParentModules: Value.undefined,
    PendingAsyncDependencies: Value.undefined,
  });
}

export function ParseRegExp(_source, _flags) {
}
