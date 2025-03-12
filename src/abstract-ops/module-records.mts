import { surroundingAgent, HostLoadImportedModule } from '../engine.mts';
import {
  CyclicModuleRecord,
  SyntheticModuleRecord,
  ResolvedBindingRecord,
  AbstractModuleRecord,
  type ModuleRecordHostDefined,
} from '../modules.mts';
import {
  JSStringValue, ObjectValue, UndefinedValue, Value,
} from '../value.mts';
import {
  Q, X, NormalCompletion, ThrowCompletion,
  type PlainCompletion,
  EnsureCompletion,
} from '../completion.mts';
import {
  Assert,
  ModuleNamespaceCreate,
  NewPromiseCapability,
  PerformPromiseThen,
  CreateBuiltinFunction,
  Call,
  ContinueDynamicImport,
  PromiseCapabilityRecord,
  Realm,
} from './all.mts';
import type { Arguments, ScriptRecord, SourceTextModuleRecord } from '#self';

/** https://tc39.es/ecma262/#graphloadingstate-record */
export class GraphLoadingState {
  readonly PromiseCapability: PromiseCapabilityRecord;

  readonly HostDefined?: ModuleRecordHostDefined;

  IsLoading = true;

  readonly Visited = new Set<CyclicModuleRecord>();

  PendingModules = 1;

  constructor({ PromiseCapability, HostDefined }: Pick<GraphLoadingState, 'PromiseCapability' | 'HostDefined'>) {
    this.PromiseCapability = PromiseCapability;
    this.HostDefined = HostDefined;
  }
}

/** https://tc39.es/ecma262/#sec-InnerModuleLoading */
export function InnerModuleLoading(state: GraphLoadingState, module: AbstractModuleRecord) {
  // 1. Assert: state.[[IsLoading]] is true.
  Assert(Boolean(state.IsLoading === true)); // this Boolean() is let step 2.d.iii not having a type error.

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

/** https://tc39.es/ecma262/#sec-ContinueModuleLoading */
export function ContinueModuleLoading(state: GraphLoadingState, result: PlainCompletion<AbstractModuleRecord>) {
  // 1. If state.[[IsLoading]] is false, return unused.
  if (state.IsLoading === false) {
    return;
  }
  result = EnsureCompletion(result);
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

/** https://tc39.es/ecma262/#sec-InnerModuleLinking */
export function InnerModuleLinking(module: AbstractModuleRecord, stack: CyclicModuleRecord[], index: number): PlainCompletion<number> {
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
        module.DFSAncestorIndex = Math.min(module.DFSAncestorIndex, requiredModule.DFSAncestorIndex!);
      }
    }
  }
  Q((module as SourceTextModuleRecord).InitializeEnvironment());
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

/** https://tc39.es/ecma262/#sec-innermoduleevaluation */
export function InnerModuleEvaluation(module: AbstractModuleRecord, stack: CyclicModuleRecord[], index: number): PlainCompletion<number> {
  if (!(module instanceof CyclicModuleRecord)) {
    Q(module.Evaluate());
    return NormalCompletion(index);
  }
  if (module.Status === 'evaluating-async' || module.Status === 'evaluated') {
    if (module.EvaluationError instanceof UndefinedValue) {
      return NormalCompletion(index);
    } else {
      return module.EvaluationError;
    }
  }
  if (module.Status === 'evaluating') {
    return NormalCompletion(index);
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
    let requiredModule = GetImportedModule(module, required) as CyclicModuleRecord;
    index = Q(InnerModuleEvaluation(requiredModule, stack, index));
    if (requiredModule instanceof CyclicModuleRecord) {
      Assert(requiredModule.Status === 'evaluating' || requiredModule.Status === 'evaluating-async' || requiredModule.Status === 'evaluated');
      Assert((requiredModule.Status === 'evaluating') === stack.includes(requiredModule));
      if (requiredModule.Status === 'evaluating') {
        module.DFSAncestorIndex = Math.min(module.DFSAncestorIndex, requiredModule.DFSAncestorIndex!);
      } else {
        requiredModule = GetAsyncCycleRoot(requiredModule);
        Assert(requiredModule.Status === 'evaluating-async' || requiredModule.Status === 'evaluated');
        if (!(requiredModule.EvaluationError instanceof UndefinedValue)) {
          return EnsureCompletion(module.EvaluationError);
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
    Q((module as SourceTextModuleRecord).ExecuteModule());
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

/** https://tc39.es/ecma262/#sec-execute-async-module */
function ExecuteAsyncModule(module: CyclicModuleRecord) {
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
  const rejectedClosure = ([error = Value.undefined]: Arguments) => {
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
  X((module as SourceTextModuleRecord).ExecuteModule(capability));
  // 11. Return.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-getcycleroot */
export function GetAsyncCycleRoot(module: CyclicModuleRecord) {
  Assert(module.Status === 'evaluated' || module.Status === 'evaluating-async');
  if (module.AsyncParentModules.length === 0) {
    return module;
  }
  while (module.DFSIndex! > module.DFSAncestorIndex!) {
    Assert(module.AsyncParentModules.length > 0);
    const nextCycleModule = module.AsyncParentModules[0];
    Assert(nextCycleModule.DFSAncestorIndex === module.DFSAncestorIndex);
    module = nextCycleModule;
  }
  Assert(module.DFSIndex === module.DFSAncestorIndex);
  return module;
}

/** https://tc39.es/ecma262/#sec-asyncmodulexecutionfulfilled */
function AsyncModuleExecutionFulfilled(module: CyclicModuleRecord) {
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
    m.PendingAsyncDependencies! -= 1;
    if (m.PendingAsyncDependencies === 0 && m.EvaluationError === Value.undefined) {
      Assert(m.AsyncEvaluating === Value.true);
      const cycleRoot = X(GetAsyncCycleRoot(m));
      if (cycleRoot.EvaluationError !== Value.undefined) {
        return Value.undefined;
      }
      if (m.Async === Value.true) {
        X(ExecuteAsyncModule(m));
      } else {
        const result = EnsureCompletion((m as SourceTextModuleRecord).ExecuteModule());
        if (result instanceof NormalCompletion) {
          X(AsyncModuleExecutionFulfilled(m));
        } else {
          X(AsyncModuleExecutionRejected(m, result.Value));
        }
      }
    }
  }
  if (!(module.TopLevelCapability instanceof UndefinedValue)) {
    Assert(module.DFSIndex === module.DFSAncestorIndex);
    X(Call(module.TopLevelCapability.Resolve, Value.undefined, [Value.undefined]));
  }
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-AsyncModuleExecutionRejected */
function AsyncModuleExecutionRejected(module: CyclicModuleRecord, error: Value) {
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
  if (!(module.TopLevelCapability instanceof UndefinedValue)) {
    Assert(module.DFSIndex === module.DFSAncestorIndex);
    X(Call(module.TopLevelCapability.Reject, Value.undefined, [error]));
  }
  return Value.undefined;
}

function getRecordWithSpecifier(loadedModules: CyclicModuleRecord['LoadedModules'], specifier: JSStringValue) {
  for (const record of loadedModules) {
    if (record.Specifier.stringValue() === specifier.stringValue()) {
      return record;
    }
  }
  return undefined;
}

/** https://tc39.es/ecma262/#sec-GetImportedModule */
export function GetImportedModule(referrer: CyclicModuleRecord, specifier: JSStringValue) {
  const record = getRecordWithSpecifier(referrer.LoadedModules, specifier);
  Assert(record !== undefined);
  return record.Module;
}

/** https://tc39.es/ecma262/#sec-FinishLoadingImportedModule */
export function FinishLoadingImportedModule(referrer: ScriptRecord | CyclicModuleRecord | Realm, specifier: JSStringValue, result: PlainCompletion<AbstractModuleRecord>, state: GraphLoadingState | PromiseCapabilityRecord) {
  result = EnsureCompletion(result);
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

/** https://tc39.es/ecma262/#sec-getmodulenamespace */
export function GetModuleNamespace(module: AbstractModuleRecord): ObjectValue {
  // 1. Assert: If module is a Cyclic Module Record, then module.[[Status]] is not new or unlinked.
  if (module instanceof CyclicModuleRecord) {
    Assert(module.Status !== 'new' && module.Status !== 'unlinked');
  }
  // 2. Let namespace be module.[[Namespace]].
  let namespace = module.Namespace;
  // 3. If namespace is empty, then
  if (namespace instanceof UndefinedValue) {
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

export function CreateSyntheticModule(exportNames: readonly JSStringValue[], evaluationSteps: (record: SyntheticModuleRecord) => PlainCompletion<void>, realm: Realm, hostDefined: ModuleRecordHostDefined) {
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
    Environment: undefined,
    Namespace: Value.undefined,
    HostDefined: hostDefined,
    ExportNames: exportNames,
    EvaluationSteps: evaluationSteps,
  });
}

/** https://tc39.es/ecma262/#sec-create-default-export-synthetic-module */
export function CreateDefaultExportSyntheticModule(defaultExport: Value, realm: Realm, hostDefined: ModuleRecordHostDefined) {
  // 1. Let closure be the a Abstract Closure with parameters (module) that captures defaultExport and performs the following steps when called:
  const closure = (module: SyntheticModuleRecord) => { // eslint-disable-line arrow-body-style
    // a. Return module.SetSyntheticExport("default", defaultExport).
    return module.SetSyntheticExport(Value('default'), defaultExport);
  };
  // 2. Return CreateSyntheticModule(« "default" », closure, realm)
  return CreateSyntheticModule([Value('default')], closure, realm, hostDefined);
}
