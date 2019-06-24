import { HostResolveImportedModule } from '../engine.mjs';
import {
  Value,
  CyclicModuleRecord,
  AbstractModuleRecord,
  ResolvedBindingRecord,
} from '../value.mjs';
import { Assert, ModuleNamespaceCreate } from './all.mjs';
import { Q, X } from '../completion.mjs';

// 15.2.1.16.4.1 #sec-innermodulelinking
export function InnerModuleLinking(module, stack, index) {
  if (!(module instanceof CyclicModuleRecord)) {
    Q(module.Link());
    return index;
  }
  if (module.Status === 'linking' || module.Status === 'linked' || module.Status === 'evaluated') {
    return index;
  }
  Assert(module.Status === 'unlinked');
  module.Status = 'linking';
  module.DFSIndex = index;
  module.DFSAncestorIndex = index;
  index += 1;
  stack.push(module);
  for (const required of module.RequestedModules) {
    const requiredModule = Q(HostResolveImportedModule(module, required));
    index = Q(InnerModuleLinking(requiredModule, stack, index));
    if (requiredModule instanceof CyclicModuleRecord) {
      Assert(requiredModule.Status === 'linking' || requiredModule.Status === 'linked' || requiredModule.Status === 'evaluated');
      Assert((requiredModule.Status === 'linking') === stack.includes(requiredModule));
      if (requiredModule.Status === 'linking') {
        module.DFSAncestorIndex = Math.min(module.DFSAncestorIndex, requiredModule.DFSAncestorIndex);
      }
    }
  }
  Q(module.InitializeEnvironment());
  Assert(stack.indexOf(module) === stack.lastIndexOf(module));
  Assert(module.DFSAncestorIndex <= module.DFSIndex);
  if (module.DFSAncestorIndex === module.DFSIndex) {
    let done = false;
    while (done === false) {
      const requiredModule = stack.pop();
      Assert(requiredModule instanceof CyclicModuleRecord);
      requiredModule.Status = 'linked';
      if (requiredModule === module) {
        done = true;
      }
    }
  }
  return index;
}

// 15.2.1.18 #sec-getmodulenamespace
export function GetModuleNamespace(module) {
  Assert(module instanceof AbstractModuleRecord);
  if (!(module instanceof CyclicModuleRecord)) {
    Assert(module.Status !== 'unlinked');
  }
  let namespace = module.Namespace;
  if (namespace === Value.undefined) {
    const exportedNames = Q(module.GetExportedNames());
    const unambiguousNames = [];
    for (const name of exportedNames) {
      const resolution = Q(module.ResolveExport(name));
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
  if (!(module instanceof CyclicModuleRecord)) {
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
  Assert(module.Status === 'linked');
  module.Status = 'evaluating';
  module.DFSIndex = index;
  module.DFSAncestorIndex = index;
  index += 1;
  stack.push(module);
  for (const required of module.RequestedModules) {
    const requiredModule = X(HostResolveImportedModule(module, required));
    index = Q(InnerModuleEvaluation(requiredModule, stack, index));
    if (requiredModule instanceof CyclicModuleRecord) {
      Assert(requiredModule.Status === 'evaluating' || requiredModule.Status === 'evaluated');
      if (stack.includes(requiredModule)) {
        Assert(requiredModule.Status === 'evaluating');
      }
      if (requiredModule.Status === 'evaluating') {
        module.DFSAncestorIndex = Math.min(module.DFSAncestorIndex, requiredModule.DFSAncestorIndex);
      }
    }
  }
  Q(module.ExecuteModule());
  Assert(stack.indexOf(module) === stack.lastIndexOf(module));
  Assert(module.DFSAncestorIndex <= module.DFSIndex);
  if (module.DFSAncestorIndex === module.DFSIndex) {
    let done = false;
    while (done === false) {
      const requiredModule = stack.pop();
      Assert(requiredModule instanceof CyclicModuleRecord);
      requiredModule.Status = 'evaluated';
      if (requiredModule === module) {
        done = true;
      }
    }
  }
  return index;
}
