import { NewModuleEnvironment } from './environment.mjs';
import { Value, Type } from './value.mjs';
import { ExecutionContext, HostResolveImportedModule, surroundingAgent } from './engine.mjs';
import {
  Assert,
  Call,
  NewPromiseCapability,
  GetModuleNamespace,
  InnerModuleEvaluation,
  InnerModuleLinking,
  SameValue,
  GetAsyncCycleRoot,
  AsyncBlockStart,
  PromiseCapabilityRecord,
} from './abstract-ops/all.mjs';
import {
  VarScopedDeclarations,
  LexicallyScopedDeclarations,
  BoundNames,
  IsConstantDeclaration,
} from './static-semantics/all.mjs';
import { InstantiateFunctionObject } from './runtime-semantics/all.mjs';
import {
  Completion,
  NormalCompletion,
  AbruptCompletion,
  EnsureCompletion,
  Q, X,
} from './completion.mjs';
import { ValueSet, unwind } from './helpers.mjs';
import { Evaluate } from './evaluator.mjs';

// #resolvedbinding-record
export class ResolvedBindingRecord {
  constructor({ Module, BindingName }) {
    Assert(Module instanceof AbstractModuleRecord);
    Assert(BindingName === 'namespace' || BindingName === 'default' || Type(BindingName) === 'String');
    this.Module = Module;
    this.BindingName = BindingName;
  }

  mark(m) {
    m(this.Module);
  }
}

// 15.2.1.15 #sec-abstract-module-records
export class AbstractModuleRecord {
  constructor({
    Realm,
    Environment,
    Namespace,
    HostDefined,
  }) {
    this.Realm = Realm;
    this.Environment = Environment;
    this.Namespace = Namespace;
    this.HostDefined = HostDefined;
  }

  mark(m) {
    m(this.Realm);
    m(this.Environment);
    m(this.Namespace);
  }
}

// 15.2.1.16 #sec-cyclic-module-records
export class CyclicModuleRecord extends AbstractModuleRecord {
  constructor(init) {
    super(init);
    this.Status = init.Status;
    this.EvaluationError = init.EvaluationError;
    this.DFSIndex = init.DFSIndex;
    this.DFSAncestorIndex = init.DFSAncestorIndex;
    this.RequestedModules = init.RequestedModules;
    this.Async = init.Async;
    this.AsyncEvaluating = init.AsyncEvaluating;
    this.TopLevelCapability = init.TopLevelCapability;
    this.AsyncParentModules = init.AsyncParentModules;
    this.PendingAsyncDependencies = init.PendingAsyncDependencies;
  }

  // #sec-moduledeclarationlinking
  Link() {
    // 1. Let module be this Cyclic Module Record.
    const module = this;
    // 2. Assert: module.[[Status]] is not linking or evaluating.
    Assert(module.Status !== 'linking' && module.Status !== 'evaluating');
    // 3. Let stack be a new empty List.
    const stack = [];
    // 4. Let result be InnerModuleLinking(module, stack, 0).
    const result = InnerModuleLinking(module, stack, 0);
    // 5. If result is an abrupt completion, then
    if (result instanceof AbruptCompletion) {
      // a. For each Cyclic Module Record m in stack, do
      for (const m of stack) {
        // i. Assert: m.[[Status]] is linking.
        Assert(m.Status === 'linking');
        // ii. Set m.[[Status]] to unlinked.
        m.Status = 'unlinked';
        // iii. Set m.[[Environment]] to undefined.
        m.Environment = Value.undefined;
        // iv. Set m.[[DFSIndex]] to undefined.
        m.DFSIndex = Value.undefined;
        // v. Set m.[[DFSAncestorIndex]] to undefined.
        m.DFSAncestorIndex = Value.undefined;
      }
      // b. Assert: module.[[Status]] is unlinked.
      Assert(module.Status === 'unlinked');
      // c. Return result.
      return result;
    }
    // 6. Assert: module.[[Status]] is linked or evaluated.
    Assert(module.Status === 'linked' || module.Status === 'evaluated');
    // 7. Assert: stack is empty.
    Assert(stack.length === 0);
    // 8. Return undefined.
    return Value.undefined;
  }

  // #sec-moduleevaluation
  Evaluate() {
    // 1. Assert: This call to Evaluate is not happening at the same time as another call to Evaluate within the surrounding agent.
    // 2. Let module be this Cyclic Module Record.
    let module = this;
    // 3. Assert: module.[[Status]] is linked or evaluated.
    Assert(module.Status === 'linked' || module.Status === 'evaluated');
    // (*TopLevelAwait) 3. If module.[[Status]] is "evaluated", set module to GetAsyncCycleRoot(module).
    if (module.Status === 'evaluated') {
      module = GetAsyncCycleRoot(module);
    }
    // (*TopLevelAwait) 4. If module.[[TopLevelCapability]] is not undefined, then
    if (module.TopLevelCapability !== Value.undefined) {
      // a. Return module.[[TopLevelCapability]].[[Promise]].
      return module.TopLevelCapability.Promise;
    }
    // 4. Let stack be a new empty List.
    const stack = [];
    // (*TopLevelAwait) 6. Let capability be ! NewPromiseCapability(%Promise%).
    const capability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
    // (*TopLevelAwait) 7. Set module.[[TopLevelCapability]] to capability.
    module.TopLevelCapability = capability;
    // 5. Let result be InnerModuleEvaluation(module, stack, 0).
    const result = InnerModuleEvaluation(module, stack, 0);
    // 6. If result is an abrupt completion, then
    if (result instanceof AbruptCompletion) {
      // a. For each Cyclic Module Record m in stack, do
      for (const m of stack) {
        // i. Assert: m.[[Status]] is evaluating.
        Assert(m.Status === 'evaluating');
        // ii. Set m.[[Status]] to evaluated.
        m.Status = 'evaluated';
        // iii. Set m.[[EvaluationError]] to result.
        m.EvaluationError = result;
      }
      // b. Assert: module.[[Status]] is evaluated and module.[[EvaluationError]] is result.
      Assert(module.Status === 'evaluated' && module.EvaluationError === result);
      // c. Return result.
      // c. (*TopLevelAwait) Perform ! Call(capability.[[Reject]], undefined, «result.[[Value]]»).
      X(Call(capability.Reject, Value.undefined, [result.Value]));
    } else { // (*TopLevelAwait) 10. Otherwise,
      // a. Assert: module.[[Status]] is "evaluated" and module.[[EvaluationError]] is undefined.
      Assert(module.Status === 'evaluated' && module.EvaluationError === Value.undefined);
      // b. If module.[[AsyncEvaluating]] is false, then
      if (module.AsyncEvaluating === Value.false) {
        // i. Perform ! Call(capability.[[Resolve]], undefined, «undefined»).
        X(Call(capability.Resolve, Value.undefined, [Value.undefined]));
      }
      // c. Assert: stack is empty.
      Assert(stack.length === 0);
    }
    // 9. Return undefined.
    // (*TopLevelAwait) 11. Return capability.[[Promise]].
    return capability.Promise;
  }

  mark(m) {
    super.mark(m);
    m(this.EvaluationError);
  }
}

// 15.2.1.17 #sec-source-text-module-records
export class SourceTextModuleRecord extends CyclicModuleRecord {
  constructor(init) {
    super(init);

    this.ImportMeta = init.ImportMeta;
    this.ECMAScriptCode = init.ECMAScriptCode;
    this.Context = init.Context;
    this.ImportEntries = init.ImportEntries;
    this.LocalExportEntries = init.LocalExportEntries;
    this.IndirectExportEntries = init.IndirectExportEntries;
    this.StarExportEntries = init.StarExportEntries;
  }

  // #sec-getexportednames
  GetExportedNames(exportStarSet) {
    // 1. If exportStarSet is not present, set exportStarSet to a new empty List.
    if (!exportStarSet) {
      exportStarSet = [];
    }
    // 2. Assert: exportStarSet is a List of Source Text Module Records.
    Assert(Array.isArray(exportStarSet) && exportStarSet.every((e) => e instanceof SourceTextModuleRecord));
    // 3. Let module be this Source Text Module Record.
    const module = this;
    // 4. If exportStarSet contains module, then
    if (exportStarSet.includes(module)) {
      // a. Assert: We've reached the starting point of an import * circularity.
      // b. Return a new empty List.
      return [];
    }
    // 5. Append module to exportStarSet.
    exportStarSet.push(module);
    // 6. Let exportedNames be a new empty List.
    const exportedNames = [];
    // 7. For each ExportEntry Record e in module.[[LocalExportEntries]], do
    for (const e of module.LocalExportEntries) {
      // a. Assert: module provides the direct binding for this export.
      // b. Append e.[[ExportName]] to exportedNames.
      exportedNames.push(e.ExportName);
    }
    // 8. For each ExportEntry Record e in module.[[IndirectExportEntries]], do
    for (const e of module.IndirectExportEntries) {
      // a. Assert: module imports a specific binding for this export.
      // b. Append e.[[ExportName]] to exportedNames.
      exportedNames.push(e.ExportName);
    }
    // 9. For each ExportEntry Record e in module.[[StarExportEntries]], do
    for (const e of module.StarExportEntries) {
      // a. Let requestedModule be ? HostResolveImportedModule(module, e.[[ModuleRequest]]).
      const requestedModule = Q(HostResolveImportedModule(module, e.ModuleRequest));
      // b. Let starNames be ? requestedModule.GetExportedNames(exportStarSet).
      const starNames = Q(requestedModule.GetExportedNames(exportStarSet));
      // c. For each element n of starNames, do
      for (const n of starNames) {
        // i. If SameValue(n, "default") is false, then
        if (SameValue(n, new Value('default')) === Value.false) {
          // 1. If n is not an element of exportedNames, then
          if (!exportedNames.includes(n)) {
            // a. Append n to exportedNames.
            exportedNames.push(n);
          }
        }
      }
    }
    // 10. Return exportedNames.
    return exportedNames;
  }

  // #sec-resolveexport
  ResolveExport(exportName, resolveSet) {
    // 1. If resolveSet is not present, set resolveSet to a new empty List.
    if (!resolveSet) {
      resolveSet = [];
    }
    // 2. Assert: resolveSet is a List of Record { [[Module]], [[ExportName]] }.
    Assert(Array.isArray(resolveSet) && resolveSet.every((e) => 'Module' in e && 'ExportName' in e));
    // 3. Let module be this Source Text Module Record.
    const module = this;
    // 4. For each Record { [[Module]], [[ExportName]] } r in resolveSet, do
    for (const r of resolveSet) {
      // a. If module and r.[[Module]] are the same Module Record and SameValue(exportName, r.[[ExportName]]) is true, then
      if (module === r.Module && SameValue(exportName, r.ExportName) === Value.true) {
        // i. Assert: This is a circular import request.
        // ii. Return null.
        return null;
      }
    }
    // 5. Append the Record { [[Module]]: module, [[ExportName]]: exportName } to resolveSet.
    resolveSet.push({ Module: module, ExportName: exportName });
    // 6. For each ExportEntry Record e in module.[[LocalExportEntries]], do
    for (const e of module.LocalExportEntries) {
      // a. If SameValue(exportName, e.[[ExportName]]) is true, then
      if (SameValue(exportName, e.ExportName) === Value.true) {
        // i. Assert: module provides the direct binding for this export.
        // ii. Return ResolvedBinding Record { [[Module]]: module, [[BindingName]]: e.[[LocalName]] }.
        return new ResolvedBindingRecord({
          Module: module,
          BindingName: e.LocalName,
        });
      }
    }
    // 7. For each ExportEntry Record e in module.[[IndirectExportEntries]], do
    for (const e of module.IndirectExportEntries) {
      // a. If SameValue(exportName, e.[[ExportName]]) is true, then
      if (SameValue(exportName, e.ExportName) === Value.true) {
        // i. Let importedModule be ? HostResolveImportedModule(module, e.[[ModuleRequest]]).
        const importedModule = Q(HostResolveImportedModule(module, e.ModuleRequest));
        // ii. If e.[[ImportName]] is ~star~, then
        if (e.ImportName === 'star') {
          // 1. Assert: module does not provide the direct binding for this export
          // 2. Return ResolvedBinding Record { [[Module]]: importedModule, [[BindingName]]: ~namespace~ }.
          return new ResolvedBindingRecord({
            Module: importedModule,
            BindingName: 'namespace',
          });
        } else { // iii. Else,
          // 1. Assert: module imports a specific binding for this export.
          // 2. Return importedModule.ResolveExport(e.[[ImportName]], resolveSet).
          return importedModule.ResolveExport(e.ImportName, resolveSet);
        }
      }
    }
    // 8. If SameValue(exportName, "default") is true, then
    if (SameValue(exportName, new Value('default')) === Value.true) {
      // a. Assert: A default export was not explicitly defined by this module.
      // b. Return null.
      return null;
      // c. NOTE: A default export cannot be provided by an export * or export * from "mod" declaration.
    }
    // 9. Let starResolution be null.
    let starResolution = null;
    // 10. For each ExportEntry Record e in module.[[StarExportEntries]], do
    for (const e of module.StarExportEntries) {
      // a. Let importedModule be ? HostResolveImportedModule(module, e.[[ModuleRequest]]).
      const importedModule = Q(HostResolveImportedModule(module, e.ModuleRequest));
      // b. Let resolution be ? importedModule.ResolveExport(exportName, resolveSet).
      const resolution = Q(importedModule.ResolveExport(exportName, resolveSet));
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
          if (resolution.Module !== starResolution.Module || SameValue(resolution.BindingName, starResolution.BindingName) === Value.false) {
            return 'ambiguous';
          }
        }
      }
    }
    // 11. Return starResolution.
    return starResolution;
  }

  // #sec-source-text-module-record-initialize-environment
  InitializeEnvironment() {
    // 1. Let module be this Source Text Module Record.
    const module = this;
    // 2. For each ExportEntry Record e in module.[[IndirectExportEntries]], do
    for (const e of module.IndirectExportEntries) {
      // a. Let resolution be ? module.ResolveExport(e.[[ExportName]]).
      const resolution = Q(module.ResolveExport(e.ExportName));
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
    // 3. Assert: All named exports from module are resolvable.
    // 4. Let realm be module.[[Realm]].
    const realm = module.Realm;
    // 5. Assert: realm is not undefined.
    Assert(realm !== Value.undefined);
    // 6. Let env be NewModuleEnvironment(realm.[[GlobalEnv]]).
    const env = NewModuleEnvironment(realm.GlobalEnv);
    // 7. Set module.[[Environment]] to env.
    module.Environment = env;
    // 8. For each ImportEntry Record in in module.[[ImportEntries]], do
    for (const ie of module.ImportEntries) {
      // a. Let importedModule be ! HostResolveImportedModule(module, in.[[ModuleRequest]]).
      const importedModule = X(HostResolveImportedModule(module, ie.ModuleRequest));
      // b. NOTE: The above call cannot fail because imported module requests are a subset of module.[[RequestedModules]], and these have been resolved earlier in this algorithm.
      // c. If in.[[ImportName]] is ~star~, then
      if (ie.ImportName === 'star') {
        // i. Let namespace be ? GetModuleNamespace(importedModule).
        const namespace = Q(GetModuleNamespace(importedModule));
        // ii. Perform ! env.CreateImmutableBinding(in.[[LocalName]], true).
        X(env.CreateImmutableBinding(ie.LocalName, Value.true));
        // iii. Call env.InitializeBinding(in.[[LocalName]], namespace).
        env.InitializeBinding(ie.LocalName, namespace);
      } else { // d. Else,
        // i. Let resolution be ? importedModule.ResolveExport(in.[[ImportName]]).
        const resolution = Q(importedModule.ResolveExport(ie.ImportName));
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
          // 1. Let namespace be ? GetModuleNamespace(resolution.[[Module]]).
          const namespace = Q(GetModuleNamespace(resolution.Module));
          // 2. Perform ! env.CreateImmutableBinding(in.[[LocalName]], true).
          X(env.CreateImmutableBinding(ie.LocalName, Value.true));
          // 3. Call env.InitializeBinding(in.[[LocalName]], namespace).
          env.InitializeBinding(ie.LocalName, namespace);
        } else { // iv. Else,
          // 1. Call env.CreateImportBinding(in.[[LocalName]], resolution.[[Module]], resolution.[[BindingName]]).
          env.CreateImportBinding(ie.LocalName, resolution.Module, resolution.BindingName);
        }
      }
    }
    // 9. Let moduleContext be a new ECMAScript code execution context.
    const moduleContext = new ExecutionContext();
    // 10. Set the Function of moduleContext to null.
    moduleContext.Function = Value.null;
    // 11. Assert: module.[[Realm]] is not undefined.
    Assert(module.Realm !== Value.undefined);
    // 12. Set the Realm of moduleContext to module.[[Realm]].
    moduleContext.Realm = module.Realm;
    // 13. Set the ScriptOrModule of moduleContext to module.
    moduleContext.ScriptOrModule = module;
    // 14. Set the VariableEnvironment of moduleContext to module.[[Environment]].
    moduleContext.VariableEnvironment = module.Environment;
    // 15. Set the LexicalEnvironment of moduleContext to module.[[Environment]].
    moduleContext.LexicalEnvironment = module.Environment;
    // 16. Set module.[[Context]] to moduleContext.
    module.Context = moduleContext;
    // 17. Push moduleContext onto the execution context stack; moduleContext is now the running execution context.
    surroundingAgent.executionContextStack.push(moduleContext);
    // 18. Let code be module.[[ECMAScriptCode]].
    const code = module.ECMAScriptCode;
    // 19. Let varDeclarations be the VarScopedDeclarations of code.
    const varDeclarations = VarScopedDeclarations(code);
    // 20. Let declaredVarNames be a new empty List.
    const declaredVarNames = new ValueSet();
    // 21. For each element d in varDeclarations, do
    for (const d of varDeclarations) {
      // a. For each element dn of the BoundNames of d, do
      for (const dn of BoundNames(d)) {
        // i. If dn is not an element of declaredVarNames, then
        if (!declaredVarNames.has(dn)) {
          // 1. Perform ! env.CreateMutableBinding(dn, false).
          X(env.CreateMutableBinding(dn, Value.false));
          // 2. Call env.InitializeBinding(dn, undefined).
          env.InitializeBinding(dn, Value.undefined);
          // 3. Append dn to declaredVarNames.
          declaredVarNames.add(dn);
        }
      }
    }
    // 22. Let lexDeclarations be the LexicallyScopedDeclarations of code.
    const lexDeclarations = LexicallyScopedDeclarations(code);
    // 23. For each element d in lexDeclarations, do
    for (const d of lexDeclarations) {
      // a. For each element dn of the BoundNames of d, do
      for (const dn of BoundNames(d)) {
        // i. If IsConstantDeclaration of d is true, then
        if (IsConstantDeclaration(d)) {
          // 1. Perform ! env.CreateImmutableBinding(dn, true).
          Q(env.CreateImmutableBinding(dn, Value.true));
        } else { // ii. Else,
          // 1. Perform ! env.CreateMutableBinding(dn, false).
          Q(env.CreateMutableBinding(dn, Value.false));
        }
        // iii. If d is a FunctionDeclaration, a GeneratorDeclaration, an AsyncFunctionDeclaration, or an AsyncGeneratorDeclaration, then
        if (d.type === 'FunctionDeclaration'
            || d.type === 'GeneratorDeclaration'
            || d.type === 'AsyncFunctionDeclaration'
            || d.type === 'AsyncGeneratorDeclaration') {
          // 1. Let fo be InstantiateFunctionObject of d with argument env.
          const fo = InstantiateFunctionObject(d, env);
          // 2. Call env.InitializeBinding(dn, fo).
          env.InitializeBinding(dn, fo);
        }
      }
    }
    // 24. Remove moduleContext from the execution context stack.
    surroundingAgent.executionContextStack.pop(moduleContext);
    // 25. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  // #sec-source-text-module-record-execute-module
  ExecuteModule(capability) {
    // 1. Let module be this Source Text Module Record.
    const module = this;
    // 2. Suspend the currently running execution context.
    // 3. Let moduleContext be module.[[Context]].
    const moduleContext = module.Context;
    if (module.Async === Value.false) {
      Assert(capability === undefined);
      // 4. Push moduleContext onto the execution context stack; moduleContext is now the running execution context.
      surroundingAgent.executionContextStack.push(moduleContext);
      // 5. Let result be the result of evaluating module.[[ECMAScriptCode]].
      const result = EnsureCompletion(unwind(Evaluate(module.ECMAScriptCode)));
      // 6. Suspend moduleContext and remove it from the execution context stack.
      // 7. Resume the context that is now on the top of the execution context stack as the running execution context.
      surroundingAgent.executionContextStack.pop(moduleContext);
      // 8. Return Completion(result).
      return Completion(result);
    } else { // (*TopLevelAwait)
      // a. Assert: capability is a PromiseCapability Record.
      Assert(capability instanceof PromiseCapabilityRecord);
      // b. Perform ! AsyncBlockStart(capability, module.[[ECMAScriptCode]], moduleCxt).
      X(AsyncBlockStart(capability, module.ECMAScriptCode, moduleContext));
      // c. Return.
      return Value.undefined;
    }
  }

  mark(m) {
    super.mark(m);
    m(this.ImportMeta);
    m(this.Context);
  }
}
