// @ts-nocheck
import { surroundingAgent, HostLoadImportedModule } from '../engine.mjs';
import {
  CyclicModuleRecord,
  SyntheticModuleRecord,
  ResolvedBindingRecord,
} from '../modules.mjs';
import { Value } from '../value.mjs';
import {
  Q, X, NormalCompletion, ThrowCompletion,
} from '../completion.mjs';
import {
  Assert,
  ModuleNamespaceCreate,
  NewPromiseCapability,
  PerformPromiseThen,
  CreateBuiltinFunction,
  Call,
  ContinueDynamicImport,
} from './all.mjs';

/** https://tc39.es/ecma262/#graphloadingstate-record */
export class GraphLoadingState {
  PromiseCapability;
  HostDefined;
  IsLoading = true;
  Visited = new Set();
  PendingModules = 1;
  constructor({ PromiseCapability, HostDefined }) {
    this.PromiseCapability = PromiseCapability;
    this.HostDefined = HostDefined;
  }
}

/** http://tc39.es/ecma262/#sec-InnerModuleLoading */
export function InnerModuleLoading(state, module) {
  // 1. Assert: state.[[IsLoading]] is true.
  Assert(state.IsLoading === true);

  // 2. If module is a Cyclic Module Record, module.[[Status]] is new, and state.[[Visited]] does not contain module, then
  if (module instanceof CyclicModuleRecord && module.Status === 'new' && !state.Visited.has(module)) {
    // a. Append module to state.[[Visited]].
    state.Visited.add(module);
    // b. Let requestedModulesCount be the number of elements in module.[[RequestedModules]].
    const requestedModulesCout = module.RequestedModules.length;
    // c. Set state.[[PendingModulesCount]] to state.[[PendingModulesCount]] + requestedModulesCount.
    state.PendingModules += requestedModulesCout;
    // d. For each String required of module.[[RequestedModules]], do
    for (const required of module.RequestedModules) {
      // i. If module.[[LoadedModules]] contains a Record whose [[Specifier]] is required, then
      //    1. Let record be that Record.
      const record = getRecordWithSpecifier(module.LoadedModules, required);
      if (record !== undefined) {
        // 2. Perform InnerModuleLoading(state, record.[[Module]]).
        ContinueModuleLoading(state, NormalCompletion(record.Module));
      // ii. Else,
      } else {
        // 1. Perform HostLoadImportedModule(module, required, state.[[HostDefined]], state).
        HostLoadImportedModule(module, required, state.HostDefined, state);
      }

      // iii. If state.[[IsLoading]] is false, return unused.
      if (state.IsLoading === false) {
        return;
      }
    }
  }

  // 3. Assert: state.[[PendingModulesCount]] ≥ 1.
  Assert(state.PendingModules >= 1);
  // 4. Set state.[[PendingModulesCount]] to state.[[PendingModulesCount]] - 1.
  state.PendingModules -= 1;
  // 5. If state.[[PendingModulesCount]] = 0, then
  if (state.PendingModules === 0) {
    // a. Set state.[[IsLoading]] to false.
    state.IsLoading = false;
    // b. For each Cyclic Module Record loaded of state.[[Visited]], do
    for (const loaded of state.Visited) {
      // i. If loaded.[[Status]] is new, set loaded.[[Status]] to unlinked.
      if (loaded.Status === 'new') {
        loaded.Status = 'unlinked';
      }
    }
    // c. Perform ! Call(state.[[PromiseCapability]].[[Resolve]], undefined, « undefined »).
    X(Call(state.PromiseCapability.Resolve, Value.undefined, [Value.undefined]));
  }

  // 6. Return unused.
}

/** http://tc39.es/ecma262/#sec-ContinueModuleLoading */
export function ContinueModuleLoading(state, result) {
  // 1. If state.[[IsLoading]] is false, return unused.
  if (state.IsLoading === false) {
    return;
  }
  // 2. If moduleCompletion is a normal completion, then
  if (result instanceof NormalCompletion) {
    // a. Perform InnerModuleLoading(state, moduleCompletion.[[Value]]).
    InnerModuleLoading(state, result.Value);
  // 3. Else,
  } else {
    // a. Set state.[[IsLoading]] to false.
    state.IsLoading = false;
    // b. Perform ! Call(state.[[PromiseCapability]].[[Reject]], undefined, « moduleCompletion.[[Value]] »).
    X(Call(state.PromiseCapability.Reject, Value.undefined, [result.Value]));
  }

  // 4. Return unused.
}

/** http://tc39.es/ecma262/#sec-InnerModuleLinking */
export function InnerModuleLinking(module, stack, index) {
  if (!(module instanceof CyclicModuleRecord)) {
    Q(module.Link());
    return index;
  }
  if (module.Status === 'linking' || module.Status === 'linked' || module.Status === 'evaluating-async' || module.Status === 'evaluated') {
    return index;
  }
  Assert(module.Status === 'unlinked');
  module.Status = 'linking';
  module.DFSIndex = index;
  module.DFSAncestorIndex = index;
  index += 1;
  stack.push(module);
  for (const required of module.RequestedModules) {
    const requiredModule = GetImportedModule(module, required);
    index = Q(InnerModuleLinking(requiredModule, stack, index));
    if (requiredModule instanceof CyclicModuleRecord) {
      Assert(requiredModule.Status === 'linking' || requiredModule.Status === 'linked' || requiredModule.Status === 'evaluating-async' || requiredModule.Status === 'evaluated');
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

/** http://tc39.es/ecma262/#sec-innermoduleevaluation */
export function InnerModuleEvaluation(module, stack, index) {
  if (!(module instanceof CyclicModuleRecord)) {
    Q(module.Evaluate());
    return index;
  }
  if (module.Status === 'evaluating-async' || module.Status === 'evaluated') {
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
  module.PendingAsyncDependencies = 0;
  module.AsyncParentModules = [];
  index += 1;
  stack.push(module);
  for (const required of module.RequestedModules) {
    let requiredModule = GetImportedModule(module, required);
    index = Q(InnerModuleEvaluation(requiredModule, stack, index));
    if (requiredModule instanceof CyclicModuleRecord) {
      Assert(requiredModule.Status === 'evaluating' || requiredModule.Status === 'evaluating-async' || requiredModule.Status === 'evaluated');
      Assert((requiredModule.Status === 'evaluating') === stack.includes(requiredModule));
      if (requiredModule.Status === 'evaluating') {
        module.DFSAncestorIndex = Math.min(module.DFSAncestorIndex, requiredModule.DFSAncestorIndex);
      } else {
        requiredModule = GetAsyncCycleRoot(requiredModule);
        Assert(requiredModule.Status === 'evaluating-async' || requiredModule.Status === 'evaluated');
        if (requiredModule.EvaluationError !== Value.undefined) {
          return module.EvaluationError;
        }
      }
      if (requiredModule.AsyncEvaluating === Value.true) {
        module.PendingAsyncDependencies += 1;
        requiredModule.AsyncParentModules.push(module);
      }
    }
  }
  if (module.PendingAsyncDependencies > 0) {
    module.AsyncEvaluating = Value.true;
  } else if (module.Async === Value.true) {
    X(ExecuteAsyncModule(module));
  } else {
    Q(module.ExecuteModule());
  }
  Assert(stack.indexOf(module) === stack.lastIndexOf(module));
  Assert(module.DFSAncestorIndex <= module.DFSIndex);
  if (module.DFSAncestorIndex === module.DFSIndex) {
    let done = false;
    while (done === false) {
      const requiredModule = stack.pop();
      Assert(requiredModule instanceof CyclicModuleRecord);
      if (requiredModule.AsyncEvaluating === Value.false) {
        requiredModule.Status = 'evaluated';
      } else {
        requiredModule.Status = 'evaluating-async';
      }
      if (requiredModule === module) {
        done = true;
      }
    }
  }
  return index;
}

/** http://tc39.es/ecma262/#sec-execute-async-module */
function ExecuteAsyncModule(module) {
  // 1. Assert: module.[[Status]] is evaluating or evaluating-async.
  Assert(module.Status === 'evaluating' || module.Status === 'evaluating-async');
  // 2. Assert: module.[[Async]] is true.
  Assert(module.Async === Value.true);
  // 3. Set module.[[AsyncEvaluating]] to true.
  module.AsyncEvaluating = Value.true;
  // 4. Let capability be ! NewPromiseCapability(%Promise%).
  const capability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  // 5. Let fulfilledClosure be a new Abstract Closure with no parameters that captures module and performs the following steps when called:
  const fulfilledClosure = () => {
    // a. Perform ! AsyncModuleExecutionFulfilled(module).
    X(AsyncModuleExecutionFulfilled(module));
    // b. Return undefined.
    return Value.undefined;
  };
  // 6. Let onFulfilled be ! CreateBuiltinFunction(fulfilledClosure, 0, "", « »).
  const onFulfilled = CreateBuiltinFunction(fulfilledClosure, 0, Value(''), ['Module']);
  // 7. Let rejectedClosure be a new Abstract Closure with parameters (error) that captures module and performs the following steps when called:
  const rejectedClosure = ([error = Value.undefined]) => {
    // a. Perform ! AsyncModuleExecutionRejected(module, error).
    X(AsyncModuleExecutionRejected(module, error));
    // b. Return undefined.
    return Value.undefined;
  };
  // 8. Let onRejected be ! CreateBuiltinFunction(rejectedClosure, 0, "", « »).
  const onRejected = CreateBuiltinFunction(rejectedClosure, 0, Value(''), ['Module']);
  // 9. Perform ! PerformPromiseThen(capability.[[Promise]], onFulfilled, onRejected).
  X(PerformPromiseThen(capability.Promise, onFulfilled, onRejected));
  // 10. Perform ! module.ExecuteModule(capability).
  X(module.ExecuteModule(capability));
  // 11. Return.
  return Value.undefined;
}

/** http://tc39.es/ecma262/#sec-getcycleroot */
export function GetAsyncCycleRoot(module) {
  Assert(module.Status === 'evaluated' || module.Status === 'evaluating-async');
  if (module.AsyncParentModules.length === 0) {
    return module;
  }
  while (module.DFSIndex > module.DFSAncestorIndex) {
    Assert(module.AsyncParentModules.length > 0);
    const nextCycleModule = module.AsyncParentModules[0];
    Assert(nextCycleModule.DFSAncestorIndex === module.DFSAncestorIndex);
    module = nextCycleModule;
  }
  Assert(module.DFSIndex === module.DFSAncestorIndex);
  return module;
}

/** http://tc39.es/ecma262/#sec-asyncmodulexecutionfulfilled */
function AsyncModuleExecutionFulfilled(module) {
  if (module.Status === 'evaluated') {
    Assert(module.EvaluationError !== Value.undefined);
    return Value.undefined;
  }
  Assert(module.Status === 'evaluating-async');
  Assert(module.EvaluationError === Value.undefined);
  module.AsyncEvaluating = Value.false;
  for (const m of module.AsyncParentModules) {
    if (module.DFSIndex !== module.DFSAncestorIndex) {
      Assert(m.DFSAncestorIndex === module.DFSAncestorIndex);
    }
    m.PendingAsyncDependencies -= 1;
    if (m.PendingAsyncDependencies === 0 && m.EvaluationError === Value.undefined) {
      Assert(m.AsyncEvaluating === Value.true);
      const cycleRoot = X(GetAsyncCycleRoot(m));
      if (cycleRoot.EvaluationError !== Value.undefined) {
        return Value.undefined;
      }
      if (m.Async === Value.true) {
        X(ExecuteAsyncModule(m));
      } else {
        const result = m.ExecuteModule();
        if (result instanceof NormalCompletion) {
          X(AsyncModuleExecutionFulfilled(m));
        } else {
          X(AsyncModuleExecutionRejected(m, result.Value));
        }
      }
    }
  }
  if (module.TopLevelCapability !== Value.undefined) {
    Assert(module.DFSIndex === module.DFSAncestorIndex);
    X(Call(module.TopLevelCapability.Resolve, Value.undefined, [Value.undefined]));
  }
  return Value.undefined;
}

/** http://tc39.es/ecma262/#sec-AsyncModuleExecutionRejected */
function AsyncModuleExecutionRejected(module, error) {
  if (module.Status === 'evaluated') {
    Assert(module.EvaluationError !== Value.undefined);
    return Value.undefined;
  }
  Assert(module.Status === 'evaluating-async');
  Assert(module.EvaluationError === Value.undefined);
  module.EvaluationError = ThrowCompletion(error);
  module.AsyncEvaluating = Value.false;
  for (const m of module.AsyncParentModules) {
    if (module.DFSIndex !== module.DFSAncestorIndex) {
      Assert(m.DFSAncestorIndex === module.DFSAncestorIndex);
    }
    X(AsyncModuleExecutionRejected(m, error));
  }
  if (module.TopLevelCapability !== Value.undefined) {
    Assert(module.DFSIndex === module.DFSAncestorIndex);
    X(Call(module.TopLevelCapability.Reject, Value.undefined, [error]));
  }
  return Value.undefined;
}

function getRecordWithSpecifier(loadedModules, specifier) {
  for (const record of loadedModules) {
    if (record.Specifier.stringValue() === specifier.stringValue()) {
      return record;
    }
  }
  return undefined;
}

/** http://tc39.es/ecma262/#sec-GetImportedModule */
export function GetImportedModule(referrer, specifier) {
  const record = getRecordWithSpecifier(referrer.LoadedModules, specifier);
  Assert(record !== undefined);
  return record.Module;
}

/** http://tc39.es/ecma262/#sec-FinishLoadingImportedModule */
export function FinishLoadingImportedModule(referrer, specifier, result, state) {
  // 1. If result is a normal completion, then
  if (result.Type === 'normal') {
    // a. If referrer.[[LoadedModules]] contains a Record whose [[Specifier]] is specifier, then
    const record = getRecordWithSpecifier(referrer.LoadedModules, specifier);
    if (record !== undefined) {
      // i. Assert: That Record's [[Module]] is result.[[Value]].
      Assert(record.Module === result.Value);
    } else {
    // b. Else, append the Record { [[Specifier]]: specifier, [[Module]]: result.[[Value]] } to referrer.[[LoadedModules]].
      referrer.LoadedModules.push({ Specifier: specifier, Module: result.Value });
    }
  }

  // 2. If payload is a GraphLoadingState Record, then
  if (state instanceof GraphLoadingState) {
    // a. Perform ContinueModuleLoading(payload, result).
    ContinueModuleLoading(state, result);
  // 3. Else,
  } else {
    // a. Perform ContinueDynamicImport(payload, result).
    ContinueDynamicImport(state, result);
  }

  // 4. Return unused.
}

/** http://tc39.es/ecma262/#sec-getmodulenamespace */
export function GetModuleNamespace(module) {
  // 1. Assert: If module is a Cyclic Module Record, then module.[[Status]] is not new or unlinked.
  if (module instanceof CyclicModuleRecord) {
    Assert(module.Status !== 'new' && module.Status !== 'unlinked');
  }
  // 2. Let namespace be module.[[Namespace]].
  let namespace = module.Namespace;
  // 3. If namespace is empty, then
  if (namespace === Value.undefined) {
    // a. Let exportedNames be module.GetExportedNames().
    const exportedNames = module.GetExportedNames();
    // b. Let unambiguousNames be a new empty List.
    const unambiguousNames = [];
    // c. For each element name of exportedNames, do
    for (const name of exportedNames) {
      // i. Let resolution be module.ResolveExport(name).
      const resolution = module.ResolveExport(name);
      // ii. If resolution is a ResolvedBinding Record, append name to unambiguousNames.
      if (resolution instanceof ResolvedBindingRecord) {
        unambiguousNames.push(name);
      }
    }
    // d. Set namespace to ModuleNamespaceCreate(module, unambiguousNames).
    namespace = ModuleNamespaceCreate(module, unambiguousNames);
  }
  // 4. Return namespace.
  return namespace;
}

export function CreateSyntheticModule(exportNames, evaluationSteps, realm, hostDefined) {
  // 1. Return Synthetic Module Record {
  //      [[Realm]]: realm,
  //      [[Environment]]: undefined,
  //      [[Namespace]]: undefined,
  //      [[HostDefined]]: hostDefined,
  //      [[ExportNames]]: exportNames,
  //      [[EvaluationSteps]]: evaluationSteps
  //    }.
  return new SyntheticModuleRecord({
    Realm: realm,
    Environment: Value.undefined,
    Namespace: Value.undefined,
    HostDefined: hostDefined,
    ExportNames: exportNames,
    EvaluationSteps: evaluationSteps,
  });
}

/** http://tc39.es/ecma262/#sec-create-default-export-synthetic-module */
export function CreateDefaultExportSyntheticModule(defaultExport, realm, hostDefined) {
  // 1. Let closure be the a Abstract Closure with parameters (module) that captures defaultExport and performs the following steps when called:
  const closure = (module) => { // eslint-disable-line arrow-body-style
    // a. Return ? module.SetSyntheticExport("default", defaultExport).
    return Q(module.SetSyntheticExport(Value('default'), defaultExport));
  };
  // 2. Return CreateSyntheticModule(« "default" », closure, realm)
  return CreateSyntheticModule([Value('default')], closure, realm, hostDefined);
}
