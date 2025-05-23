import { ModuleEnvironmentRecord } from './environment.mts';
import {
  Value, JSStringValue, ObjectValue, UndefinedValue, BooleanValue,
  NullValue,
} from './value.mts';
import { ExecutionContext, surroundingAgent, type GCMarker } from './host-defined/engine.mts';
import {
  Assert,
  Call,
  NewPromiseCapability,
  GetImportedModule,
  GetModuleNamespace,
  InnerModuleEvaluation,
  InnerModuleLinking,
  InnerModuleLoading,
  SameValue,
  AsyncBlockStart,
  PromiseCapabilityRecord,
  GraphLoadingState,
  Realm,
} from './abstract-ops/all.mts';
import {
  VarScopedDeclarations,
  LexicallyScopedDeclarations,
  BoundNames,
  IsConstantDeclaration,
  type ImportEntry,
  type ExportEntry,
} from './static-semantics/all.mts';
import { InstantiateFunctionObject } from './runtime-semantics/all.mts';
import {
  Completion,
  NormalCompletion,
  AbruptCompletion,
  EnsureCompletion,
  Q, X, ThrowCompletion,
  IfAbruptRejectPromise,
} from './completion.mts';
import { JSStringSet, type Mutable } from './helpers.mts';
import {
  Evaluate, type Evaluator, type PlainEvaluator, type ValueEvaluator,
} from './evaluator.mts';
import type { ParseNode } from './parser/ParseNode.mts';
import type {
  ImportAttributeRecord,
  ModuleRequestRecord,
  PlainCompletion, PromiseObject,
} from '#self';

// https://tc39.es/ecma262/#loadedmodulerequest-record
export interface LoadedModuleRequestRecord {
  readonly Specifier: JSStringValue;
  readonly Attributes: ImportAttributeRecord[];
  readonly Module: AbstractModuleRecord
}

// #resolvedbinding-record
export class ResolvedBindingRecord {
  readonly Module: AbstractModuleRecord;

  readonly BindingName: 'namespace' | JSStringValue;

  constructor({ Module, BindingName }: Pick<ResolvedBindingRecord, 'BindingName' | 'Module'>) {
    Assert(Module instanceof AbstractModuleRecord);
    Assert(BindingName === 'namespace' || BindingName instanceof JSStringValue);
    this.Module = Module;
    this.BindingName = BindingName;
  }

  mark(m: GCMarker) {
    m(this.Module);
  }
}

export type ModuleRecordHostDefinedPublic = unknown;
export type ModuleRecordHostDefined = {
  public?: ModuleRecordHostDefinedPublic;
  specifier?: string | undefined;
  readonly SourceTextModuleRecord?: typeof SourceTextModuleRecord;
  scriptId?: string;
  readonly doNotTrackScriptId?: boolean;
};
export type AbstractModuleInit = Pick<AbstractModuleRecord, 'Realm' | 'Environment' | 'Namespace' | 'HostDefined'>;

interface ResolveSetItem {
  readonly Module: AbstractModuleRecord;
  readonly ExportName: JSStringValue;
}

/** https://tc39.es/ecma262/#sec-abstract-module-records */
export abstract class AbstractModuleRecord {
  abstract LoadRequestedModules(hostDefined?: ModuleRecordHostDefined): PromiseObject;

  abstract GetExportedNames(exportStarSet?: AbstractModuleRecord[]): readonly JSStringValue[];

  abstract ResolveExport(exportName: JSStringValue, resolveSet?: ResolveSetItem[]): 'ambiguous' | ResolvedBindingRecord | null;

  abstract Link(): PlainCompletion<void>;

  abstract Evaluate(): Evaluator<PromiseObject>;

  readonly Realm: Realm;

  readonly Environment: ModuleEnvironmentRecord | undefined;

  readonly Namespace: ObjectValue | undefined = undefined;

  readonly DeferredNamespace: ObjectValue | undefined = undefined;

  readonly HostDefined: ModuleRecordHostDefined;

  constructor(init: AbstractModuleInit) {
    this.Realm = init.Realm;
    this.Environment = init.Environment;
    this.HostDefined = init.HostDefined;
  }

  mark(m: GCMarker) {
    m(this.Realm);
    m(this.Environment);
    m(this.Namespace);
    m(this.DeferredNamespace);
  }
}

export { AbstractModuleRecord as ModuleRecord };

export type CyclicModuleRecordInit = AbstractModuleInit & Readonly<Pick<CyclicModuleRecord, 'Status' | 'EvaluationError' | 'DFSIndex' | 'DFSAncestorIndex' | 'RequestedModules' | 'LoadedModules' | 'CycleRoot' | 'HasTLA' | 'AsyncEvaluationOrder' | 'TopLevelCapability' | 'AsyncParentModules' | 'PendingAsyncDependencies'>>;
export type CyclicModuleRecordStatus = 'new' | 'unlinked' | 'linking' | 'linked' | 'evaluating' | 'evaluating-async' | 'evaluated';
/** https://tc39.es/ecma262/#sec-cyclic-module-records */
export abstract class CyclicModuleRecord extends AbstractModuleRecord {
  Status: CyclicModuleRecordStatus;

  EvaluationError: ThrowCompletion | undefined;

  DFSIndex: number | undefined;

  DFSAncestorIndex: number | undefined;

  readonly RequestedModules: readonly ModuleRequestRecord[];

  readonly LoadedModules: LoadedModuleRequestRecord[];

  readonly HasTLA: BooleanValue;

  AsyncEvaluationOrder: 'unset' | number | 'done';

  AsyncParentModules: CyclicModuleRecord[];

  CycleRoot: CyclicModuleRecord | undefined;

  TopLevelCapability: PromiseCapabilityRecord | undefined;

  PendingAsyncDependencies: number | undefined;

  constructor(init: CyclicModuleRecordInit) {
    super(init);
    this.Status = init.Status;
    this.EvaluationError = init.EvaluationError;
    this.DFSIndex = init.DFSIndex;
    this.DFSAncestorIndex = init.DFSAncestorIndex;
    this.RequestedModules = init.RequestedModules;
    this.LoadedModules = init.LoadedModules;
    this.CycleRoot = init.CycleRoot;
    this.HasTLA = init.HasTLA;
    this.AsyncEvaluationOrder = init.AsyncEvaluationOrder;
    this.TopLevelCapability = init.TopLevelCapability;
    this.AsyncParentModules = init.AsyncParentModules;
    this.PendingAsyncDependencies = init.PendingAsyncDependencies;
  }

  abstract ExecuteModule(capability?: PromiseCapabilityRecord): ValueEvaluator;

  /** https://tc39.es/ecma262/#sec-LoadRequestedModules */
  LoadRequestedModules(hostDefined?: ModuleRecordHostDefined) {
    const module = this;

    // 2. Let pc be ! NewPromiseCapability(%Promise%).
    const pc = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
    // 3. Let state be a new GraphLoadingState Record { [[IsLoading]]: true, [[PendingModulesCount]]: 1, [[Visited]]: « », [[PromiseCapability]]: pc, [[HostDefined]]: hostDefined }.
    const state = new GraphLoadingState({
      PromiseCapability: pc,
      HostDefined: hostDefined,
    });
    // 4. Perform InnerModuleLoading(state, module).
    InnerModuleLoading(state, module);
    // 5. Return pc.[[Promise]].
    return pc.Promise;
  }

  /** https://tc39.es/ecma262/#sec-moduledeclarationlinking */
  Link() {
    const module = this;
    // 1. Assert: module.[[Status]] is unlinked, linked, evaluating-async, or evaluated.
    Assert(module.Status === 'unlinked' || module.Status === 'linked' || module.Status === 'evaluating-async' || module.Status === 'evaluated');
    // 2. Let stack be a new empty List.
    const stack: CyclicModuleRecord[] = [];
    // 3. Let result be Completion(InnerModuleLinking(module, stack, 0)).
    const result = InnerModuleLinking(module, stack, 0);
    // 5. If result is an abrupt completion, then
    if (result instanceof AbruptCompletion) {
      // a. For each Cyclic Module Record m of stack, do
      for (const m of stack) {
        // i. Assert: m.[[Status]] is linking.
        Assert(m.Status === 'linking');
        // ii. Set m.[[Status]] to unlinked.
        m.Status = 'unlinked';
      }
      // b. Assert: module.[[Status]] is unlinked.
      Assert(module.Status === 'unlinked');
      // c. Return result.
      return result;
    }
    // 6. Assert: module.[[Status]] is linked, evaluating-async, or evaluated.
    Assert(module.Status === 'linked' || module.Status === 'evaluating-async' || module.Status === 'evaluated');
    // 7. Assert: stack is empty.
    Assert(stack.length === 0);
    // 8. Return unused.
    return NormalCompletion(undefined);
  }

  /** https://tc39.es/ecma262/#sec-moduleevaluation */
  * Evaluate(): Evaluator<PromiseObject> {
    let module: CyclicModuleRecord = this;

    if (surroundingAgent.feature('import-defer')) {
      // 1. Assert: None of module or any of its recursive dependencies have [[Status]] set to evaluating, linking, unlinked, or new.
      Assert((function getModules(module: AbstractModuleRecord, list: CyclicModuleRecord[]) {
        if (!(module instanceof CyclicModuleRecord) || list.includes(module)) {
          return list;
        }
        list.push(module);
        for (const r of module.RequestedModules) {
          getModules(GetImportedModule(module, r), list);
        }
        return list;
      }(this, [])).every((m) => m.Status !== 'evaluating' && m.Status !== 'linking' && m.Status !== 'unlinked' && m.Status !== 'new'));
    }

    // 3. Assert: module.[[Status]] is linked or evaluated.
    Assert(module.Status === 'linked' || module.Status === 'evaluating-async' || module.Status === 'evaluated');
    // 3. If module.[[Status]] is evaluating-async or evaluated, then
    if (module.Status === 'evaluating-async' || module.Status === 'evaluated') {
      // a. Assert: _module_.[[CycleRoot]] is not ~empty~.
      Assert(module.CycleRoot !== undefined);
      // b. Set _module_ to _module_.[[CycleRoot]].
      module = module.CycleRoot!;
    }
    // 4. If module.[[TopLevelCapability]] is not ~empty~, then
    if (module.TopLevelCapability !== undefined) {
      // a. Return module.[[TopLevelCapability]].[[Promise]].
      return module.TopLevelCapability.Promise;
    }
    // 4. Let stack be a new empty List.
    const stack: CyclicModuleRecord[] = [];
    // (*TopLevelAwait) 6. Let capability be ! NewPromiseCapability(%Promise%).
    const capability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
    // (*TopLevelAwait) 7. Set module.[[TopLevelCapability]] to capability.
    module.TopLevelCapability = capability;
    // 5. Let result be InnerModuleEvaluation(module, stack, 0).
    const result = yield* InnerModuleEvaluation(module, stack, 0);
    // 6. If result is an abrupt completion, then
    if (result instanceof AbruptCompletion) {
      // a. For each Cyclic Module Record m in stack, do
      for (const m of stack) {
        // i. Assert: m.[[Status]] is evaluating.
        Assert(m.Status === 'evaluating');
        // ii. Assert: m.[[AsyncEvaluationOrder]] is unset.
        Assert(m.AsyncEvaluationOrder === 'unset');
        // iii. Set m.[[Status]] to evaluated.
        m.Status = 'evaluated';
        // iv. Set m.[[EvaluationError]] to result.
        m.EvaluationError = result;
        // v. Set _m_.[[CycleRoot]] to _m_.
        m.CycleRoot = m;
      }
      // b. Assert: module.[[Status]] is evaluated and module.[[EvaluationError]] is result.
      Assert(module.Status === 'evaluated' && module.EvaluationError === result);
      // c. Return result.
      // c. (*TopLevelAwait) Perform ! Call(capability.[[Reject]], undefined, «result.[[Value]]»).
      X(Call(capability.Reject, Value.undefined, [result.Value]));
    } else { // (*TopLevelAwait) 10. Otherwise,
      // a. Assert: module.[[Status]] is evaluating-async or evaluated.
      Assert(module.Status === 'evaluating-async' || module.Status === 'evaluated');
      // b. Assert: module.[[EvaluationError]] is ~empty~.
      Assert(module.EvaluationError === undefined);
      // c. If module.[[Status]] is evaluated, then
      if (module.Status === 'evaluated') {
        // i. Assert: module.[[AsyncEvaluationOrder]] is not an integer.
        Assert(typeof module.AsyncEvaluationOrder !== 'number');
        // ii. Perform ! Call(capability.[[Resolve]], undefined, «undefined»).
        X(Call(capability.Resolve, Value.undefined, [Value.undefined]));
      }
      // d. Assert: stack is empty.
      Assert(stack.length === 0);
    }
    // 9. Return undefined.
    // (*TopLevelAwait) 11. Return capability.[[Promise]].
    return capability.Promise;
  }

  override mark(m: GCMarker) {
    super.mark(m);
    m(this.EvaluationError);
    for (const v of this.LoadedModules) {
      m(v.Module);
    }
  }
}

export type SourceTextModuleRecordInit = CyclicModuleRecordInit & Pick<SourceTextModuleRecord, 'ImportMeta' | 'ECMAScriptCode' | 'Context' | 'ImportEntries' | 'LocalExportEntries' | 'IndirectExportEntries' | 'StarExportEntries'>;
/** https://tc39.es/ecma262/#sec-source-text-module-records */
export class SourceTextModuleRecord extends CyclicModuleRecord {
  ImportMeta: ObjectValue | undefined;

  readonly ECMAScriptCode: ParseNode.Module;

  readonly Context: ExecutionContext | undefined;

  readonly ImportEntries: readonly ImportEntry[];

  readonly LocalExportEntries: readonly ExportEntry[];

  readonly IndirectExportEntries: readonly ExportEntry[];

  readonly StarExportEntries: readonly ExportEntry[];

  constructor(init: SourceTextModuleRecordInit) {
    super(init);

    this.ImportMeta = init.ImportMeta;
    this.ECMAScriptCode = init.ECMAScriptCode;
    this.Context = init.Context;
    this.ImportEntries = init.ImportEntries;
    this.LocalExportEntries = init.LocalExportEntries;
    this.IndirectExportEntries = init.IndirectExportEntries;
    this.StarExportEntries = init.StarExportEntries;
  }

  /** https://tc39.es/ecma262/#sec-getexportednames */
  GetExportedNames(exportStarSet: AbstractModuleRecord[]) {
    const module = this;
    // 1. Assert: module.[[Status]] is not new.
    Assert(module.Status !== 'new');
    // 2. If exportStarSet is not present, set exportStarSet to a new empty List.
    if (!exportStarSet) {
      exportStarSet = [];
    }
    // 3. If exportStarSet contains module, then
    if (exportStarSet.includes(module)) {
      // a. Assert: We've reached the starting point of an import * circularity.
      // b. Return a new empty List.
      return [];
    }
    // 4. Append module to exportStarSet.
    exportStarSet.push(module);
    // 5. Let exportedNames be a new empty List.
    const exportedNames: JSStringValue[] = [];
    // 6. For each ExportEntry Record e in module.[[LocalExportEntries]], do
    for (const e of module.LocalExportEntries) {
      // a. Assert: module provides the direct binding for this export.
      // b. Assert: e.[[ExportName]] is not null.
      Assert(!(e.ExportName instanceof NullValue));
      // c. Append e.[[ExportName]] to exportedNames.
      exportedNames.push(e.ExportName);
    }
    // 7. For each ExportEntry Record e in module.[[IndirectExportEntries]], do
    for (const e of module.IndirectExportEntries) {
      // a. Assert: module imports a specific binding for this export.
      // b. Assert: e.[[ExportName]] is not null.
      Assert(!(e.ExportName instanceof NullValue));
      // c. Append e.[[ExportName]] to exportedNames.
      exportedNames.push(e.ExportName);
    }
    // 8. For each ExportEntry Record e in module.[[StarExportEntries]], do
    for (const e of module.StarExportEntries) {
      // a. Let requestedModule be GetImportedModule(module, e.[[ModuleRequest]]).
      const requestedModule = GetImportedModule(module, e.ModuleRequest as ModuleRequestRecord);
      // b. Let starNames be requestedModule.GetExportedNames(exportStarSet).
      const starNames = requestedModule.GetExportedNames(exportStarSet);
      // c. For each element n of starNames, do
      for (const n of starNames) {
        // i. If SameValue(n, "default") is false, then
        if (SameValue(n, Value('default')) === Value.false) {
          // 1. If n is not an element of exportedNames, then
          if (!exportedNames.includes(n)) {
            // a. Append n to exportedNames.
            exportedNames.push(n);
          }
        }
      }
    }
    // 9. Return exportedNames.
    return exportedNames;
  }

  /** https://tc39.es/ecma262/#sec-resolveexport */
  ResolveExport(exportName: JSStringValue, resolveSet?: ResolveSetItem[]) {
    const module = this;
    // 1. Assert: module.[[Status]] is not new.
    Assert(module.Status !== 'new');
    // 2. If resolveSet is not present, set resolveSet to a new empty List.
    if (!resolveSet) {
      resolveSet = [];
    }
    // 3. For each Record { [[Module]], [[ExportName]] } r in resolveSet, do
    for (const r of resolveSet) {
      // a. If module and r.[[Module]] are the same Module Record and SameValue(exportName, r.[[ExportName]]) is true, then
      if (module === r.Module && SameValue(exportName, r.ExportName) === Value.true) {
        // i. Assert: This is a circular import request.
        // ii. Return null.
        return null;
      }
    }
    // 4. Append the Record { [[Module]]: module, [[ExportName]]: exportName } to resolveSet.
    resolveSet.push({ Module: module, ExportName: exportName });
    // 5. For each ExportEntry Record e in module.[[LocalExportEntries]], do
    for (const e of module.LocalExportEntries) {
      // a. If SameValue(exportName, e.[[ExportName]]) is true, then
      if (SameValue(exportName, e.ExportName) === Value.true) {
        // i. Assert: module provides the direct binding for this export.
        // ii. Return ResolvedBinding Record { [[Module]]: module, [[BindingName]]: e.[[LocalName]] }.
        return new ResolvedBindingRecord({
          Module: module,
          BindingName: e.LocalName as JSStringValue,
        });
      }
    }
    // 6. For each ExportEntry Record e in module.[[IndirectExportEntries]], do
    for (const e of module.IndirectExportEntries) {
      // a. If SameValue(exportName, e.[[ExportName]]) is true, then
      if (SameValue(exportName, e.ExportName) === Value.true) {
        // i. Let importedModule be GetImportedModule(module, e.[[ModuleRequest]]).
        const importedModule = GetImportedModule(module, e.ModuleRequest as ModuleRequestRecord);
        // ii. If e.[[ImportName]] is ~all~, then
        if (e.ImportName === 'all') {
          // 1. Assert: module does not provide the direct binding for this export
          // 2. Return ResolvedBinding Record { [[Module]]: importedModule, [[BindingName]]: ~namespace~ }.
          return new ResolvedBindingRecord({
            Module: importedModule,
            BindingName: 'namespace',
          });
        } else { // iv. Else,
          // 1. Assert: module imports a specific binding for this export.
          // 2. Return importedModule.ResolveExport(e.[[ImportName]], resolveSet).
          return importedModule.ResolveExport(e.ImportName as JSStringValue, resolveSet);
        }
      }
    }
    // 7. If SameValue(exportName, "default") is true, then
    if (SameValue(exportName, Value('default')) === Value.true) {
      // a. Assert: A default export was not explicitly defined by this module.
      // b. Return null.
      return null;
      // c. NOTE: A default export cannot be provided by an export * or export * from "mod" declaration.
    }
    // 8. Let starResolution be null.
    let starResolution = null;
    // 9. For each ExportEntry Record e in module.[[StarExportEntries]], do
    for (const e of module.StarExportEntries) {
      // a. Let importedModule be GetImportedModule(module, e.[[ModuleRequest]]).
      const importedModule = GetImportedModule(module, e.ModuleRequest as ModuleRequestRecord);
      // b. Let resolution be importedModule.ResolveExport(exportName, resolveSet).
      const resolution = importedModule.ResolveExport(exportName, resolveSet);
      // c. If resolution is "ambiguous", return "ambiguous".
      if (resolution === 'ambiguous') {
        return 'ambiguous';
      }
      // d. If resolution is not null, then
      if (resolution !== null) {
        // a. Assert: resolution is a ResolvedBinding Record.
        Assert(resolution instanceof ResolvedBindingRecord);
        // b. If starResolution is null, set starResolution to resolution.
        if (starResolution === null) {
          starResolution = resolution;
        } else { // c. Else,
          // 1. Assert: There is more than one * import that includes the requested name.
          // 2. If resolution.[[Module]] and starResolution.[[Module]] are not the same Module Record or SameValue(resolution.[[BindingName]], starResolution.[[BindingName]]) is false, return "ambiguous".
          if (resolution.Module !== starResolution.Module || SameValue(resolution.BindingName as JSStringValue, starResolution.BindingName as JSStringValue) === Value.false) {
            return 'ambiguous';
          }
        }
      }
    }
    // 11. Return starResolution.
    return starResolution;
  }

  /** https://tc39.es/ecma262/#sec-source-text-module-record-initialize-environment */
  InitializeEnvironment() {
    const module = this as Mutable<SourceTextModuleRecord>;
    // 1. For each ExportEntry Record e in module.[[IndirectExportEntries]], do
    for (const e of module.IndirectExportEntries) {
      // a. Let resolution be module.ResolveExport(e.[[ExportName]]).
      const resolution = module.ResolveExport(e.ExportName as JSStringValue);
      // b. If resolution is null or "ambiguous", throw a SyntaxError exception.
      if (resolution === null || resolution === 'ambiguous') {
        return surroundingAgent.Throw(
          'SyntaxError',
          'ResolutionNullOrAmbiguous',
          resolution,
          e.ExportName,
          module,
        );
      }
      // c. Assert: resolution is a ResolvedBinding Record.
      Assert(resolution instanceof ResolvedBindingRecord);
    }
    // 2. Assert: All named exports from module are resolvable.
    // 3. Let realm be module.[[Realm]].
    const realm = module.Realm;
    // 4. Assert: realm is not undefined.
    Assert(!(realm instanceof UndefinedValue));
    // 5. Let env be NewModuleEnvironment(realm.[[GlobalEnv]]).
    const env = new ModuleEnvironmentRecord(realm.GlobalEnv);
    // 6. Set module.[[Environment]] to env.
    module.Environment = env;
    // 7. For each ImportEntry Record in in module.[[ImportEntries]], do
    for (const ie of module.ImportEntries) {
      // a. Let importedModule be GetImportedModule(module, in.[[ModuleRequest]]).
      const importedModule = GetImportedModule(module, ie.ModuleRequest);
      // b. If in.[[ImportName]] is ~namespace-object~, then
      if (ie.ImportName === 'namespace-object') {
        // i. Let namespace be GetModuleNamespace(importedModule).
        const namespace = GetModuleNamespace(importedModule, /* [import-defer] */ ie.ModuleRequest.Phase);
        // ii. Perform ! env.CreateImmutableBinding(in.[[LocalName]], true).
        X(env.CreateImmutableBinding(ie.LocalName, Value.true));
        // iii. Call env.InitializeBinding(in.[[LocalName]], namespace).
        X(env.InitializeBinding(ie.LocalName, namespace));
      } else { // c. Else,
        // i. Let resolution be importedModule.ResolveExport(in.[[ImportName]]).
        const resolution = importedModule.ResolveExport(ie.ImportName);
        // ii. If resolution is null or "ambiguous", throw a SyntaxError exception.
        if (resolution === null || resolution === 'ambiguous') {
          return surroundingAgent.Throw(
            'SyntaxError',
            'ResolutionNullOrAmbiguous',
            resolution,
            ie.ImportName,
            importedModule,
          );
        }
        // iii. If resolution.[[BindingName]] is ~namespace~, then
        if (resolution.BindingName === 'namespace') {
          // 1. Let namespace be GetModuleNamespace(resolution.[[Module]]).
          const namespace = GetModuleNamespace(resolution.Module, /* [import-defer] */ 'evaluation');
          // 2. Perform ! env.CreateImmutableBinding(in.[[LocalName]], true).
          X(env.CreateImmutableBinding(ie.LocalName, Value.true));
          // 3. Call env.InitializeBinding(in.[[LocalName]], namespace).
          X(env.InitializeBinding(ie.LocalName, namespace));
        } else { // iv. Else,
          // 1. Call env.CreateImportBinding(in.[[LocalName]], resolution.[[Module]], resolution.[[BindingName]]).
          X(env.CreateImportBinding(ie.LocalName, resolution.Module, resolution.BindingName));
        }
      }
    }
    // 8. Let moduleContext be a new ECMAScript code execution context.
    const moduleContext = new ExecutionContext();
    // 9. Set the Function of moduleContext to null.
    moduleContext.Function = Value.null;
    // 10. Assert: module.[[Realm]] is not undefined.
    Assert(!(module.Realm instanceof UndefinedValue));
    // 11. Set the Realm of moduleContext to module.[[Realm]].
    moduleContext.Realm = module.Realm;
    // 12. Set the ScriptOrModule of moduleContext to module.
    moduleContext.ScriptOrModule = module;
    // 13. Set the VariableEnvironment of moduleContext to module.[[Environment]].
    moduleContext.VariableEnvironment = module.Environment!;
    // 14. Set the LexicalEnvironment of moduleContext to module.[[Environment]].
    moduleContext.LexicalEnvironment = module.Environment!;
    // 15. Set the PrivateEnvironment of moduleContext to null.
    moduleContext.PrivateEnvironment = Value.null;
    // 16. Set module.[[Context]] to moduleContext.
    module.Context = moduleContext;
    // 17. Push moduleContext onto the execution context stack; moduleContext is now the running execution context.
    surroundingAgent.executionContextStack.push(moduleContext);
    // 18. Let code be module.[[ECMAScriptCode]].
    const code = module.ECMAScriptCode;
    // 19. Let varDeclarations be the VarScopedDeclarations of code.
    const varDeclarations = VarScopedDeclarations(code);
    // 20. Let declaredVarNames be a new empty List.
    const declaredVarNames = new JSStringSet();
    // 21. For each element d in varDeclarations, do
    for (const d of varDeclarations) {
      // a. For each element dn of the BoundNames of d, do
      for (const dn of BoundNames(d)) {
        // i. If dn is not an element of declaredVarNames, then
        if (!declaredVarNames.has(dn)) {
          // 1. Perform ! env.CreateMutableBinding(dn, false).
          X(env.CreateMutableBinding(dn, Value.false));
          // 2. Call env.InitializeBinding(dn, undefined).
          X(env.InitializeBinding(dn, Value.undefined));
          // 3. Append dn to declaredVarNames.
          declaredVarNames.add(dn);
        }
      }
    }
    // 22. Let lexDeclarations be the LexicallyScopedDeclarations of code.
    const lexDeclarations = LexicallyScopedDeclarations(code);
    // 24. For each element d in lexDeclarations, do
    for (const d of lexDeclarations) {
      // a. For each element dn of the BoundNames of d, do
      for (const dn of BoundNames(d)) {
        // i. If IsConstantDeclaration of d is true, then
        if (IsConstantDeclaration(d)) {
          // 1. Perform ! env.CreateImmutableBinding(dn, true).
          X(env.CreateImmutableBinding(dn, Value.true));
        } else { // ii. Else,
          // 1. Perform ! env.CreateMutableBinding(dn, false).
          X(env.CreateMutableBinding(dn, Value.false));
        }
        // iii. If d is a FunctionDeclaration, a GeneratorDeclaration, an AsyncFunctionDeclaration, or an AsyncGeneratorDeclaration, then
        if (d.type === 'FunctionDeclaration'
          || d.type === 'GeneratorDeclaration'
          || d.type === 'AsyncFunctionDeclaration'
          || d.type === 'AsyncGeneratorDeclaration') {
          // 1. Let fo be InstantiateFunctionObject of d with argument env.
          const fo = InstantiateFunctionObject(d, env, Value.null);
          // 2. Call env.InitializeBinding(dn, fo).
          X(env.InitializeBinding(dn, fo));
        }
      }
    }
    // 25. Remove moduleContext from the execution context stack.
    surroundingAgent.executionContextStack.pop(moduleContext);
    // 26. Return unused.
    return NormalCompletion(undefined);
  }

  /** https://tc39.es/ecma262/#sec-source-text-module-record-execute-module */
  * ExecuteModule(capability?: PromiseCapabilityRecord): ValueEvaluator {
    // 1. Let module be this Source Text Module Record.
    const module = this;
    // 2. Suspend the currently running execution context.
    // 3. Let moduleContext be module.[[Context]].
    const moduleContext = module.Context!;
    if (module.HasTLA === Value.false) {
      Assert(capability === undefined);
      // 4. Push moduleContext onto the execution context stack; moduleContext is now the running execution context.
      surroundingAgent.executionContextStack.push(moduleContext);
      // 5. Let result be the result of evaluating module.[[ECMAScriptCode]].
      const result = EnsureCompletion(yield* (Evaluate(module.ECMAScriptCode)));
      // 6. Suspend moduleContext and remove it from the execution context stack.
      // 7. Resume the context that is now on the top of the execution context stack as the running execution context.
      surroundingAgent.executionContextStack.pop(moduleContext);
      // 8. Return Completion(result).
      return Q(result);
    } else { // (*TopLevelAwait)
      // a. Assert: capability is a PromiseCapability Record.
      Assert(capability instanceof PromiseCapabilityRecord);
      // b. Perform ! AsyncBlockStart(capability, module.[[ECMAScriptCode]], moduleCxt).
      X(yield* AsyncBlockStart(capability, module.ECMAScriptCode, moduleContext));
      // c. Return.
      return Value.undefined;
    }
  }

  override mark(m: GCMarker) {
    super.mark(m);
    m(this.ImportMeta);
    m(this.Context);
  }
}

export type SyntheticModuleRecordInit = AbstractModuleInit & Pick<SyntheticModuleRecord, 'ExportNames' | 'EvaluationSteps'>;
/** https://tc39.es/ecma262/#sec-synthetic-module-records */
export class SyntheticModuleRecord extends AbstractModuleRecord {
  override LoadRequestedModules(): PromiseObject {
    const promise = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
    X(Call(promise.Resolve, Value.undefined, [Value.undefined]));
    return promise.Promise;
  }

  readonly ExportNames: readonly JSStringValue[];

  readonly EvaluationSteps: (module: SyntheticModuleRecord) => PlainEvaluator | Completion<unknown> | void;

  constructor(init: SyntheticModuleRecordInit) {
    super(init);

    this.ExportNames = init.ExportNames;
    this.EvaluationSteps = init.EvaluationSteps;
  }

  /** https://tc39.es/ecma262/#sec-synthetic-module-record-getexportednames */
  GetExportedNames() {
    const module = this;
    // 1. Return module.[[ExportNames]].
    return module.ExportNames;
  }

  /** https://tc39.es/ecma262/#sec-synthetic-module-record-resolveexport */
  ResolveExport(exportName: JSStringValue): ResolvedBindingRecord | null {
    const module = this;
    // 1. If module.[[ExportNames]] does not contain exportName, return null.
    // 2. Return ResolvedBinding Record { [[Module]]: module, [[BindingName]]: exportName }.
    for (const e of module.ExportNames) {
      if (SameValue(e, exportName) === Value.true) {
        return new ResolvedBindingRecord({ Module: module, BindingName: exportName });
      }
    }
    return null;
  }

  /** https://tc39.es/ecma262/#sec-synthetic-module-record-link */
  Link() {
    const module = this;
    // 1. Let realm be module.[[Realm]].
    const realm = module.Realm;
    // 2. Assert: realm is not undefined.
    Assert(!(realm instanceof UndefinedValue));
    // 3. Let env be NewModuleEnvironment(realm.[[GlobalEnv]]).
    const env = new ModuleEnvironmentRecord(realm.GlobalEnv);
    // 4. Set module.[[Environment]] to env.
    (module as Mutable<AbstractModuleRecord>).Environment = env;
    // 5. For each exportName in module.[[ExportNames]],
    for (const exportName of module.ExportNames) {
      // a. Perform ! env.CreateMutableBinding(exportName, false).
      X(env.CreateMutableBinding(exportName, Value.false));
      // b. Perform ! env.InitializeBinding(exportName, undefined).
      X(env.InitializeBinding(exportName, Value.undefined));
    }
    // 8. Return undefined.
    return undefined;
  }

  /** https://tc39.es/ecma262/#sec-synthetic-module-record-evaluate */
  * Evaluate(): Evaluator<PromiseObject> {
    const module = this;
    // 1. Suspend the currently running execution context.
    // 2. Let moduleContext be a new ECMAScript code execution context.
    const moduleContext = new ExecutionContext();
    // 3. Set the Function of moduleContext to null.
    moduleContext.Function = Value.null;
    // 4. Set the Realm of moduleContext to module.[[Realm]].
    moduleContext.Realm = module.Realm;
    // 5. Set the ScriptOrModule of moduleContext to module.
    moduleContext.ScriptOrModule = module;
    // 6. Set the VariableEnvironment of moduleContext to module.[[Environment]].
    moduleContext.VariableEnvironment = module.Environment!;
    // 7. Set the LexicalEnvironment of moduleContext to module.[[Environment]].
    moduleContext.LexicalEnvironment = module.Environment!;
    moduleContext.PrivateEnvironment = Value.null;
    // 8. Push moduleContext on to the execution context stack; moduleContext is now the running execution context.
    surroundingAgent.executionContextStack.push(moduleContext);
    // 9. Let steps be module.[[EvaluationSteps]].
    const steps = module.EvaluationSteps;
    // 10. Let result be Completion(steps(module)).
    let result = steps(module);
    if (result && 'next' in result) {
      result = yield* result;
    }
    // 11. Suspend moduleContext and remove it from the execution context stack.
    // 12. Resume the context that is now on the top of the execution context stack as the running execution context.
    surroundingAgent.executionContextStack.pop(moduleContext);
    // 13. Let pc be ! NewPromiseCapability(%Promise%).
    const pc = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
    // 14. IfAbruptRejectPromise(result, pc).
    IfAbruptRejectPromise(result, pc);
    // 15. Perform ! Call(pc.[[Resolve]], undefined, « undefined »).
    X(Call(pc.Resolve, Value.undefined, [Value.undefined]));
    // 16. Return pc.[[Promise]].
    return pc.Promise;
  }

  * SetSyntheticExport(name: JSStringValue, value: Value): PlainEvaluator {
    const module = this;
    // 1. Return module.[[Environment]].SetMutableBinding(name, value, true).
    return yield* (module.Environment as ModuleEnvironmentRecord).SetMutableBinding(name, value, Value.true);
  }
}
