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
  Completion,
  NormalCompletion,
  AbruptCompletion,
  Q,
  X,
} from './completion.mjs';

// #importentry-record
export class ImportEntryRecord {
  constructor({
    ModuleRequest,
    ImportName,
    LocalName,
  }) {
    Assert(Type(ModuleRequest) === 'String');
    Assert(Type(ImportName) === 'String');
    Assert(Type(LocalName) === 'String');
    this.ModuleRequest = ModuleRequest;
    this.ImportName = ImportName;
    this.LocalName = LocalName;
  }
}

// #exportentry-record
export class ExportEntryRecord {
  constructor({
    ExportName,
    ModuleRequest,
    ImportName,
    LocalName,
  }) {
    Assert(Type(ExportName) === 'String' || Type(ExportName) === 'Null');
    Assert(Type(ModuleRequest) === 'String' || Type(ModuleRequest) === 'Null');
    Assert(Type(ImportName) === 'String' || Type(ImportName) === 'Null');
    Assert(Type(LocalName) === 'String' || Type(LocalName) === 'Null');
    this.ExportName = ExportName;
    this.ModuleRequest = ModuleRequest;
    this.ImportName = ImportName;
    this.LocalName = LocalName;
  }
}

// #resolvedbinding-record
export class ResolvedBindingRecord {
  constructor({ Module, BindingName }) {
    Assert(Module instanceof AbstractModuleRecord);
    Assert(Type(BindingName) === 'String');
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

  // 15.2.1.16.1 #sec-moduledeclarationlinking
  Link() {
    const module = this;
    Assert(module.Status !== 'linking' && module.Status !== 'evaluating');
    const stack = [];
    const result = InnerModuleLinking(module, stack, 0);
    if (result instanceof AbruptCompletion) {
      for (const m of stack) {
        Assert(m.Status === 'linking');
        m.Status = 'unlinked';
        m.Environment = Value.undefined;
        m.DFSIndex = Value.undefined;
        m.DFSAncestorIndex = Value.undefined;
      }
      Assert(module.Status === 'unlinked');
      return result;
    }
    Assert(module.Status === 'linked' || module.Status === 'evaluated');
    Assert(stack.length === 0);
    return Value.undefined;
  }

  // 15.2.1.16.2 #sec-moduleevaluation
  Evaluate() {
    let module = this;
    Assert(module.Status === 'linked' || module.Status === 'evaluated');
    if (module.Status === 'evaluated') {
      module = GetAsyncCycleRoot(module);
    }
    if (module.TopLevelCapability !== Value.undefined) {
      return module.TopLevelCapability.Promise;
    }
    const stack = [];
    const capability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
    module.TopLevelCapability = capability;
    const result = InnerModuleEvaluation(module, stack, 0);
    if (result instanceof AbruptCompletion) {
      for (const m of stack) {
        Assert(m.Status === 'evaluating');
        m.Status = 'evaluated';
        m.EvaluationError = result;
      }
      Assert(module.Status === 'evaluated' && module.EvaluationError === result);
      X(Call(capability.Reject, Value.undefined, [result.Value]));
    } else {
      Assert(module.Status === 'evaluated' && module.EvaluationError === Value.undefined);
      if (module.AsyncEvaluating === Value.false) {
        X(Call(capability.Resolve, Value.undefined, [Value.undefined]));
      }
      Assert(stack.length === 0);
    }
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

  // 15.2.1.17.2 #sec-getexportednames
  GetExportedNames(exportStarSet) {
    const module = this;
    if (!exportStarSet) {
      exportStarSet = [];
    }
    Assert(Array.isArray(exportStarSet) && exportStarSet.every((e) => e instanceof SourceTextModuleRecord));
    if (exportStarSet.includes(module)) {
      // Assert: We've reached the starting point of an import * circularity.
      return [];
    }
    exportStarSet.push(module);
    const exportedNames = [];
    for (const e of module.LocalExportEntries) {
      // Assert: module provides the direct binding for this export.
      exportedNames.push(e.ExportName);
    }
    for (const e of module.IndirectExportEntries) {
      // Assert: module imports a specific binding for this export.
      exportedNames.push(e.ExportName);
    }
    for (const e of module.StarExportEntries) {
      const requestedModule = Q(HostResolveImportedModule(module, e.ModuleRequest));
      const starNames = Q(requestedModule.GetExportedNames(exportStarSet));
      for (const n of starNames) {
        if (SameValue(n, new Value('default')) === Value.false) {
          if (!exportedNames.includes(n)) {
            exportedNames.push(n);
          }
        }
      }
    }
    return exportedNames;
  }

  // 15.2.1.17.3 #sec-resolveexport
  ResolveExport(exportName, resolveSet) {
    const module = this;
    if (!resolveSet) {
      resolveSet = [];
    }
    Assert(Array.isArray(resolveSet) && resolveSet.every((e) => 'Module' in e && 'ExportName' in e));
    for (const r of resolveSet) {
      if (module === r.Module && SameValue(exportName, r.ExportName) === Value.true) {
        // Assert: This is a circular import request.
        return null;
      }
    }
    resolveSet.push({ Module: module, ExportName: exportName });
    for (const e of module.LocalExportEntries) {
      if (SameValue(exportName, e.ExportName) === Value.true) {
        // Assert: module provides the direct binding for this export.
        return new ResolvedBindingRecord({
          Module: module,
          BindingName: e.LocalName,
        });
      }
    }
    for (const e of module.IndirectExportEntries) {
      if (SameValue(exportName, e.ExportName) === Value.true) {
        // Assert: module provides the direct binding for this export.
        const importedModule = Q(HostResolveImportedModule(module, e.ModuleRequest));
        return importedModule.ResolveExport(e.ImportName, resolveSet);
      }
    }
    if (SameValue(exportName, new Value('default')) === Value.true) {
      // Assert: A default export was not explicitly defined by this module.
      return null;
      // NOTE: A default export cannot be provided by an export *.
    }
    let starResolution = null;
    for (const e of module.StarExportEntries) {
      const importedModule = Q(HostResolveImportedModule(module, e.ModuleRequest));
      const resolution = Q(importedModule.ResolveExport(exportName, resolveSet));
      if (resolution === 'ambiguous') {
        return 'ambiguous';
      }
      if (resolution !== null) {
        Assert(resolution instanceof ResolvedBindingRecord);
        if (starResolution === null) {
          starResolution = resolution;
        } else {
          // Assert: There is more than one * import that includes the requested name.
          if (resolution.Module !== starResolution.Module || SameValue(resolution.BindingName, starResolution.BindingName) === Value.false) {
            return 'ambiguous';
          }
        }
      }
    }
    return starResolution;
  }

  // 15.2.1.17.4 #sec-source-text-module-record-initialize-environment
  InitializeEnvironment() {
    const module = this;
    for (const e of module.IndirectExportEntries) {
      const resolution = Q(module.ResolveExport(e.ExportName));
      if (resolution === null || resolution === 'ambiguous') {
        return surroundingAgent.Throw(
          'SyntaxError',
          'ResolutionNullOrAmbiguous',
          resolution,
          e.ExportName,
          module,
        );
      }
      // Assert: resolution is a ResolvedBinding Record.
    }
    // Assert: All named exports from module are resolvable.
    const realm = module.Realm;
    Assert(realm !== Value.undefined);
    const env = NewModuleEnvironment(realm.GlobalEnv);
    module.Environment = env;
    const envRec = env.EnvironmentRecord;
    for (const ie of module.ImportEntries) {
      const importedModule = X(HostResolveImportedModule(module, ie.ModuleRequest));
      if (ie.ImportName.stringValue() === '*') {
        const namespace = Q(GetModuleNamespace(importedModule));
        X(envRec.CreateImmutableBinding(ie.LocalName, Value.true));
        envRec.InitializeBinding(ie.LocalName, namespace);
      } else {
        const resolution = Q(importedModule.ResolveExport(ie.ImportName));
        if (resolution === null || resolution === 'ambiguous') {
          return surroundingAgent.Throw(
            'SyntaxError',
            'ResolutionNullOrAmbiguous',
            resolution,
            ie.ImportName,
            importedModule,
          );
        }
        envRec.CreateImportBinding(ie.LocalName, resolution.Module, resolution.BindingName);
      }
    }

    const moduleContext = new ExecutionContext();
    moduleContext.Function = Value.null;
    Assert(module.Realm !== Value.undefined);
    moduleContext.Realm = module.Realm;
    moduleContext.ScriptOrModule = module;
    moduleContext.VariableEnvironment = module.Environment;
    moduleContext.LexicalEnvironment = module.Environment;
    module.Context = moduleContext;
    surroundingAgent.executionContextStack.push(moduleContext);

    const code = module.ECMAScriptCode.body;
    const varDeclarations = VarScopedDeclarations_ModuleBody(code);
    const declaredVarNames = [];
    for (const d of varDeclarations) {
      for (const dn of BoundNames_VariableDeclaration(d)) {
        if (!declaredVarNames.includes(dn)) {
          X(envRec.CreateMutableBinding(new Value(dn), Value.false));
          envRec.InitializeBinding(new Value(dn), Value.undefined);
          declaredVarNames.push(dn);
        }
      }
    }
    const lexDeclarations = LexicallyScopedDeclarations_Module(code);
    for (const d of lexDeclarations) {
      for (const dn of BoundNames_ModuleItem(d)) {
        if (IsConstantDeclaration(d)) {
          Q(envRec.CreateImmutableBinding(new Value(dn), Value.true));
        } else {
          Q(envRec.CreateMutableBinding(new Value(dn), Value.false));
        }
        if (isFunctionDeclaration(d) || isGeneratorDeclaration(d)
            || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d)) {
          const fo = InstantiateFunctionObject(d, env);
          envRec.InitializeBinding(new Value(dn), fo);
        }
      }
    }

    surroundingAgent.executionContextStack.pop(moduleContext);

    return new NormalCompletion(undefined);
  }

  // 15.2.1.17.5 #sec-source-text-module-record-execute-module
  ExecuteModule(capability) {
    const module = this;
    const moduleContext = module.Context;
    if (module.Async === Value.false) {
      Assert(capability === undefined);
      surroundingAgent.executionContextStack.push(moduleContext);
      const result = Evaluate_Module(module.ECMAScriptCode.body);
      surroundingAgent.executionContextStack.pop(moduleContext);
      // Resume the context that is now on the top of the execution context stack as the running execution context.
      return Completion(result);
    } else {
      Assert(capability instanceof PromiseCapabilityRecord);
      X(AsyncBlockStart(capability, module.ECMAScriptCode.body, moduleContext));
      return Value.undefined;
    }
  }

  mark(m) {
    super.mark(m);
    m(this.ImportMeta);
    m(this.Context);
  }
}
