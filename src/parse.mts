// @ts-nocheck
import { Parser, type ParserOptions } from './parser/Parser.mts';
import { RegExpParser, type RegExpParserContext } from './parser/RegExpParser.mts';
import { surroundingAgent, type GCMarker } from './engine.mts';
import { SourceTextModuleRecord } from './modules.mts';
import { JSStringValue, ObjectValue, Value } from './value.mts';
import {
  Get,
  Set,
  Call,
  CreateDefaultExportSyntheticModule,
  Realm,
  type BuiltinFunctionObject,
} from './abstract-ops/all.mts';
import { Q, X } from './completion.mts';
import {
  ModuleRequests,
  ImportEntries,
  ExportEntries,
  ImportedLocalNames,
} from './static-semantics/all.mts';
import { ValueSet, kInternal } from './helpers.mts';
import type { ParseNode } from './parser/ParseNode.mts';

export { Parser, RegExpParser };

function handleError(e: unknown) {
  if (e instanceof SyntaxError) {
    const v = surroundingAgent.Throw('SyntaxError', 'Raw', e.message).Value as ObjectValue;
    if (e.decoration) {
      const stackString = Value('stack');
      const stack = X(Get(v, stackString));
      const newStackString = `${e.decoration}\n${stack instanceof JSStringValue ? stack.stringValue() : ''}`;
      X(Set(v, stackString, Value(newStackString), Value.true));
    }
    return v;
  } else {
    throw e;
  }
}

export function wrappedParse<T>(init: ParserOptions, f: (parser: Parser) => T) {
  const p = new Parser(init);

  try {
    const r = f(p);
    if (p.earlyErrors.size > 0) {
      return [...p.earlyErrors].map((e) => handleError(e));
    }
    return r;
  } catch (e) {
    return [handleError(e)];
  }
}

export function ParseScript(sourceText: string, realm: Realm, hostDefined = {}) {
  // 1. Assert: sourceText is an ECMAScript source text (see clause 10).
  // 2. Parse sourceText using Script as the goal symbol and analyse the parse result for
  //    any Early Error conditions. If the parse was successful and no early errors were found,
  //    let body be the resulting parse tree. Otherwise, let body be a List of one or more
  //    SyntaxError objects representing the parsing errors and/or early errors. Parsing and
  //    early error detection may be interweaved in an implementation-dependent manner. If more
  //    than one parsing error or early error is present, the number and ordering of error
  //    objects in the list is implementation-dependent, but at least one must be present.
  const body = wrappedParse({
    source: sourceText,
    specifier: hostDefined.specifier,
    json: hostDefined[kInternal]?.json,
  }, (p) => p.parseScript());
  // 3. If body is a List of errors, return body.
  if (Array.isArray(body)) {
    return body;
  }
  // 4. Return Script Record { [[Realm]]: realm, [[ECMAScriptCode]]: body, [[HostDefined]]: hostDefined }.
  return {
    Realm: realm,
    ECMAScriptCode: body,
    LoadedModules: [],
    HostDefined: hostDefined,
    mark(m: GCMarker) {
      m(this.Realm);
      m(this.Environment);
      for (const v of this.LoadedModules) {
        m(v.Module);
      }
    },
  };
}

export interface ParseModuleHostDefined {
  readonly specifier?: string;
  readonly SourceTextModuleRecord?: typeof SourceTextModuleRecord;
}
export function ParseModule(sourceText: string, realm: Realm, hostDefined: ParseModuleHostDefined = {}) {
  // 1. Assert: sourceText is an ECMAScript source text (see clause 10).
  // 2. Parse sourceText using Module as the goal symbol and analyse the parse result for
  //    any Early Error conditions. If the parse was successful and no early errors were found,
  //    let body be the resulting parse tree. Otherwise, let body be a List of one or more
  //    SyntaxError objects representing the parsing errors and/or early errors. Parsing and
  //    early error detection may be interweaved in an implementation-dependent manner. If more
  //    than one parsing error or early error is present, the number and ordering of error
  //    objects in the list is implementation-dependent, but at least one must be present.
  const body = wrappedParse<ParseNode.Module>({ source: sourceText, specifier: hostDefined.specifier }, (p) => p.parseModule());
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
  const exportEntries = ExportEntries(body);
  // 11. For each ExportEntry Record ee in exportEntries, do
  for (const ee of exportEntries) {
    // a. If ee.[[ModuleRequest]] is null, then
    if (ee.ModuleRequest === Value.null) {
      // i. If ee.[[LocalName]] is not an element of importedBoundNames, then
      if (!importedBoundNames.has(ee.LocalName)) {
        // 1. Append ee to localExportEntries.
        localExportEntries.push(ee);
      } else { // ii. Else,
        // 1. Let ie be the element of importEntries whose [[LocalName]] is the same as ee.[[LocalName]].
        const ie = importEntries.find((e) => e.LocalName.stringValue() === ee.LocalName.stringValue());
        // 2. If ie.[[ImportName]] is ~namespace-object~, then
        if (ie.ImportName === 'namespace-object') {
          // a. NOTE: This is a re-export of an imported module namespace object.
          // b. Append ee to localExportEntries.
          localExportEntries.push(ee);
        } else { // 3. Else,
          // a. NOTE: This is a re-export of a single name.
          // b. Append the ExportEntry Record { [[ModuleRequest]]: ie.[[ModuleRequest]], [[ImportName]]: ie.[[ImportName]], [[LocalName]]: null, [[ExportName]]: ee.[[ExportName]] } to indirectExportEntries.
          indirectExportEntries.push({
            ModuleRequest: ie.ModuleRequest,
            ImportName: ie.ImportName,
            LocalName: Value.null,
            ExportName: ee.ExportName,
          });
        }
      }
    } else if (ee.ImportName && ee.ImportName === 'all-but-default' && ee.ExportName === Value.null) { // b. Else if ee.[[ImportName]] is ~all-but-default~ and ee.[[ExportName]] is null, then
      // i. Append ee to starExportEntries.
      starExportEntries.push(ee);
    } else { // c. Else,
      // i. Append ee to indirectExportEntries.
      indirectExportEntries.push(ee);
    }
  }
  // 12. Return Source Text Module Record { [[Realm]]: realm, [[Environment]]: undefined, [[Namespace]]: undefined, [[Status]]: unlinked, [[EvaluationError]]: undefined, [[HostDefined]]: hostDefined, [[ECMAScriptCode]]: body, [[Context]]: empty, [[ImportMeta]]: empty, [[RequestedModules]]: requestedModules, [[ImportEntries]]: importEntries, [[LocalExportEntries]]: localExportEntries, [[IndirectExportEntries]]: indirectExportEntries, [[StarExportEntries]]: starExportEntries, [[DFSIndex]]: undefined, [[DFSAncestorIndex]]: undefined }.
  return new (hostDefined.SourceTextModuleRecord || SourceTextModuleRecord)({
    Realm: realm,
    Environment: Value.undefined,
    Namespace: Value.undefined,
    Status: 'new',
    EvaluationError: Value.undefined,
    HostDefined: hostDefined,
    ECMAScriptCode: body,
    Context: undefined,
    ImportMeta: undefined,
    RequestedModules: requestedModules,
    LoadedModules: [],
    ImportEntries: importEntries,
    LocalExportEntries: localExportEntries,
    IndirectExportEntries: indirectExportEntries,
    StarExportEntries: starExportEntries,
    DFSIndex: Value.undefined,
    DFSAncestorIndex: Value.undefined,

    Async: body.hasTopLevelAwait ? Value.true : Value.false,
    AsyncEvaluating: Value.false,
    TopLevelCapability: Value.undefined,
    AsyncParentModules: Value.undefined,
    PendingAsyncDependencies: Value.undefined,
  });
}

/** https://tc39.es/ecma262/#sec-parsejsonmodule */
export function ParseJSONModule(sourceText: Value, realm: Realm, hostDefined: unknown) {
  // 1. Let jsonParse be realm's intrinsic object named "%JSON.parse%".
  const jsonParse = realm.Intrinsics['%JSON.parse%'] as BuiltinFunctionObject;
  // 1. Let json be ? Call(jsonParse, undefined, « sourceText »).
  const json = Q(Call(jsonParse, Value.undefined, [sourceText]));
  // 1. Return CreateDefaultExportSyntheticModule(json, realm, hostDefined).
  return CreateDefaultExportSyntheticModule(json, realm, hostDefined);
}

/** https://tc39.es/ecma262/#sec-parsepattern */
export function ParsePattern(patternText: string, u: boolean) {
  const parse = (flags: RegExpParserContext) => {
    const p = new RegExpParser(patternText);
    return p.scope(flags, () => p.parsePattern());
  };
  try {
    // 1. If u is true, then
    if (u) {
      // a. Parse patternText using the grammars in 21.2.1. The goal symbol for the parse is Pattern[+U, +N].
      return parse({ U: true, N: true });
    } else { // 2. Else
      // a. Parse patternText using the grammars in 21.2.1. The goal symbol for the parse is Pattern[~U, ~N].
      //    If the result of parsing contains a GroupName, reparse with the goal symbol Pattern[~U, +N] and use this result instead.
      const pattern = parse({ U: false, N: false });
      if (pattern.groupSpecifiers.size > 0) {
        return parse({ U: false, N: true });
      }
      return pattern;
    }
  } catch (e) {
    return [handleError(e)];
  }
}
