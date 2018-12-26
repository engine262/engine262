import { HostResolveImportedModule, ExecutionContext, surroundingAgent } from '../engine.mjs';
import {
  Value,
  SourceTextModuleRecord,
  ModuleRecord,
  ResolvedBindingRecord,
} from '../value.mjs';
import { NewModuleEnvironment } from '../environment.mjs';
import { Assert, ModuleNamespaceCreate } from './all.mjs';
import {
  Q,
  X,
  NormalCompletion,
  Completion,
} from '../completion.mjs';
import { InstantiateFunctionObject } from '../runtime-semantics/all.mjs';
import { Evaluate_Module } from '../evaluator.mjs';
import {
  VarScopedDeclarations_ModuleBody,
  LexicallyScopedDeclarations_ModuleItemList,
  BoundNames_VariableDeclaration,
  BoundNames_Declaration,
  IsConstantDeclaration,
} from '../static-semantics/all.mjs';
import {
  isFunctionDeclaration,
  isGeneratorDeclaration,
  isAsyncFunctionDeclaration,
  isAsyncGeneratorDeclaration,
} from '../ast.mjs';
import { msg } from '../helpers.mjs';

// 15.2.1.16.4.1 #sec-innermoduleinstantiation
export function InnerModuleInstantiation(module, stack, index) {
  if (!(module instanceof SourceTextModuleRecord)) {
    Q(module.Instantiate());
    return index;
  }
  if (module.Status === 'instantiating' || module.Status === 'instantiated' || module.Status === 'evaluated') {
    return index;
  }
  Assert(module.Status === 'uninstantiated');
  module.Status = 'instantiating';
  module.DFSIndex = index;
  module.DFSAncestorIndex = index;
  index += 1;
  stack.push(module);
  for (const required of module.RequestedModules) {
    const requiredModule = Q(HostResolveImportedModule(module, required));
    index = Q(InnerModuleInstantiation(requiredModule, stack, index));
    Assert(requiredModule.Status === 'instantiating' || requiredModule.Status === 'instantiated' || requiredModule.Status === 'evaluated');
    if (stack.includes(requiredModule)) {
      Assert(requiredModule.Status === 'instantiating');
    }
    if (requiredModule.Status === 'instantiating') {
      Assert(requiredModule instanceof SourceTextModuleRecord);
      module.DFSAncestorIndex = Math.min(module.DFSAncestorIndex, requiredModule.DFSAncestorIndex);
    }
  }
  Q(ModuleDeclarationEnvironmentSetup(module));
  Assert(stack.indexOf(module) === stack.lastIndexOf(module));
  Assert(module.DFSAncestorIndex <= module.DFSIndex);
  if (module.DFSAncestorIndex === module.DFSIndex) {
    let done = false;
    while (done === false) {
      const requiredModule = stack.pop();
      requiredModule.Status = 'instantiated';
      if (requiredModule === module) {
        done = true;
      }
    }
  }
  return index;
}

// 15.2.1.16.4.2 #sec-moduledeclarationenvironmentsetup
export function ModuleDeclarationEnvironmentSetup(module) {
  for (const e of module.IndirectExportEntries) {
    const resolution = Q(module.ResolveExport(e.ExportName, []));
    if (resolution === null || resolution === 'ambiguous') {
      return surroundingAgent.Throw('SyntaxError', msg('ResolutionNullOrAmbiguous', resolution, e.ExportName, module));
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
    if (ie.ImportName === new Value('*')) {
      const namespace = Q(GetModuleNamespace(importedModule));
      X(envRec.CreateImmutableBinding(ie.LocalName, Value.true));
      envRec.InitializeBinding(ie.LocalName, namespace);
    } else {
      const resolution = Q(importedModule.ResolveExport(ie.ImportName, []));
      if (resolution === null || resolution === 'ambiguous') {
        return surroundingAgent.Throw('SyntaxError', msg('ResolutionNullOrAmbiguous', resolution, ie.ImportName, importedModule));
      }
      envRec.CreateImportBinding(ie.LocalName, resolution.Module, resolution.BindingName);
    }
  }
  const code = module.ECMAScriptCode.body;
  const varDeclarations = VarScopedDeclarations_ModuleBody(code);
  const declaredVarNames = [];
  for (const d of varDeclarations) {
    for (const dn of BoundNames_VariableDeclaration(d).map(Value)) {
      if (!declaredVarNames.includes(dn)) {
        X(envRec.CreateMutableBinding(dn, Value.false));
        envRec.InitializeBinding(dn, Value.undefined);
        declaredVarNames.push(dn);
      }
    }
  }
  const lexDeclarations = LexicallyScopedDeclarations_ModuleItemList(code);
  for (const d of lexDeclarations) {
    for (const dn of BoundNames_Declaration(d).map(Value)) {
      if (IsConstantDeclaration(d)) {
        Q(envRec.CreateImmutableBinding(dn, Value.true));
      } else {
        Q(envRec.CreateMutableBinding(dn, Value.false));
      }
      if (isFunctionDeclaration(d) || isGeneratorDeclaration(d)
          || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d)) {
        const fo = InstantiateFunctionObject(d, env);
        envRec.InitializeBinding(dn, fo);
      }
    }
  }
  return new NormalCompletion(undefined);
}

// 15.2.1.18 #sec-getmodulenamespace
export function GetModuleNamespace(module) {
  Assert(module instanceof ModuleRecord);
  Assert(module.Status !== 'uninstantiated');
  let namespace = module.Namespace;
  if (namespace === Value.undefined) {
    const exportedNames = Q(module.GetExportedNames([]));
    const unambiguousNames = [];
    for (const name of exportedNames) {
      const resolution = Q(module.ResolveExport(name, []));
      if (resolution instanceof ResolvedBindingRecord) {
        unambiguousNames.push(name);
      }
    }
    namespace = ModuleNamespaceCreate(module, unambiguousNames);
  }
  return namespace;
}

// 15.2.1.16.5.1 #sec-innermoduleevaluation
export function InnerModuleEvaluation(module, stack, index) {
  if (!(module instanceof SourceTextModuleRecord)) {
    Q(module.Evaluate());
    return index;
  }
  if (module.Status === 'evaluated') {
    if (module.EvaluationError === Value.undefined) {
      return index;
    } else {
      return module.EvaluationError;
    }
  }
  if (module.Status === 'evaluating') {
    return index;
  }
  Assert(module.Status === 'instantiated');
  module.Status = 'evaluating';
  module.DFSIndex = index;
  module.DFSAncestorIndex = index;
  index += 1;
  stack.push(module);
  for (const required of module.RequestedModules) {
    const requiredModule = X(HostResolveImportedModule(module, required));
    index = Q(InnerModuleEvaluation(requiredModule, stack, index));
    Assert(requiredModule.Status === 'evaluating' || requiredModule.Status === 'evaluated');
    if (stack.includes(requiredModule)) {
      Assert(requiredModule.Status === 'evaluating');
    }
    if (requiredModule.Status === 'evaluating') {
      Assert(requiredModule instanceof SourceTextModuleRecord);
      module.DFSAncestorIndex = Math.min(module.DFSAncestorIndex, requiredModule.DFSAncestorIndex);
    }
  }
  Q(ModuleExecution(module));
  Assert(stack.indexOf(module) === stack.lastIndexOf(module));
  Assert(module.DFSAncestorIndex <= module.DFSIndex);
  if (module.DFSAncestorIndex === module.DFSIndex) {
    let done = false;
    while (done === false) {
      const requiredModule = stack.pop();
      requiredModule.Status = 'evaluated';
      if (requiredModule === module) {
        done = true;
      }
    }
  }
  return index;
}

export function ModuleExecution(module) {
  const moduleCtx = new ExecutionContext();
  moduleCtx.Function = Value.null;
  moduleCtx.Realm = module.Realm;
  moduleCtx.ScriptOrModule = module;
  // Assert: module has been linked and declarations in its module environment have been instantiated.
  moduleCtx.VariableEnvironment = module.Environment;
  moduleCtx.LexicalEnvironment = module.Environment;
  // Suspend the currently running execution context.
  surroundingAgent.executionContextStack.push(moduleCtx);
  const result = Evaluate_Module(module.ECMAScriptCode.body);
  surroundingAgent.executionContextStack.pop(moduleCtx);
  // Resume the context that is now on the top of the execution context stack as the running execution context.
  return Completion(result);
}
