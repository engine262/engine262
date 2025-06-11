import { surroundingAgent } from '../host-defined/engine.mts';
import { Q, X } from '../completion.mts';
import { AbstractModuleRecord, CyclicModuleRecord, ResolvedBindingRecord } from '../modules.mts';
import {
  SymbolValue,
  Value,
  Descriptor,
  wellKnownSymbols,
  JSStringValue,
  type ObjectInternalMethods,
  UndefinedValue,
  type PropertyKeyValue,
  ObjectValue,
  BooleanValue,
} from '../value.mts';
import {
  JSStringSet, type Mutable,
} from '../helpers.mts';
import {
  Assert,
  CompareArrayElements,
  SameValue,
  MakeBasicObject,
  IsPropertyKey,
  IsAccessorDescriptor,
  SetImmutablePrototype,
  OrdinaryGetOwnProperty,
  OrdinaryDefineOwnProperty,
  OrdinaryHasProperty,
  OrdinaryGet,
  OrdinaryDelete,
  OrdinaryOwnPropertyKeys,
  GetModuleNamespace, R,
  type ExoticObject,
  EvaluateModuleSync,
  GetImportedModule,
} from './all.mts';
import type { ModuleRecord, PlainEvaluator } from '#self';

export interface ModuleNamespaceObject extends ExoticObject {
  readonly Module: AbstractModuleRecord;
  readonly Exports: JSStringSet;
  /* [import-defer] */ readonly Deferred: boolean;
}

export function isModuleNamespaceObject(V: Value): V is ModuleNamespaceObject {
  return V instanceof ObjectValue && 'Module' in V;
}

const InternalMethods = {
  * GetPrototypeOf() {
    return Value.null;
  },
  * SetPrototypeOf(V) {
    return Q(yield* SetImmutablePrototype(this, V));
  },
  * IsExtensible() {
    return Value.false;
  },
  * PreventExtensions() {
    return Value.true;
  },
  * GetOwnProperty(P) {
    const O = this;

    if (surroundingAgent.feature('import-defer') ? IsSymbolLikeNamespaceKey(P, O) : P instanceof SymbolValue) {
      return OrdinaryGetOwnProperty(O, P);
    }
    let exports;
    if (surroundingAgent.feature('import-defer')) {
      exports = Q(yield* GetModuleExportsList(O));
    } else {
      exports = O.Exports;
    }
    if (!exports.has(P as JSStringValue)) {
      return Value.undefined;
    }
    const value = Q(yield* O.Get(P, O));
    return Descriptor({
      Value: value,
      Writable: Value.true,
      Enumerable: Value.true,
      Configurable: Value.false,
    });
  },
  * DefineOwnProperty(P, Desc) {
    const O = this;

    if (surroundingAgent.feature('import-defer') ? IsSymbolLikeNamespaceKey(P, O) : P instanceof SymbolValue) {
      return yield* OrdinaryDefineOwnProperty(O, P, Desc);
    }

    const current = Q(yield* O.GetOwnProperty(P));
    if (current instanceof UndefinedValue) {
      return Value.false;
    }
    if (IsAccessorDescriptor(Desc)) {
      return Value.false;
    }
    if (Desc.Writable !== undefined && Desc.Writable === Value.false) {
      return Value.false;
    }
    if (Desc.Enumerable !== undefined && Desc.Enumerable === Value.false) {
      return Value.false;
    }
    if (Desc.Configurable !== undefined && Desc.Configurable === Value.true) {
      return Value.false;
    }
    if (Desc.Value !== undefined) {
      return SameValue(Desc.Value, current.Value!);
    }
    return Value.true;
  },
  * HasProperty(P) {
    const O = this;

    if (surroundingAgent.feature('import-defer') ? IsSymbolLikeNamespaceKey(P, O) : P instanceof SymbolValue) {
      return yield* OrdinaryHasProperty(O, P);
    }
    let exports;
    if (surroundingAgent.feature('import-defer')) {
      exports = Q(yield* GetModuleExportsList(O));
    } else {
      exports = O.Exports;
    }
    if (exports.has(P as JSStringValue)) {
      return Value.true;
    }
    return Value.false;
  },
  /** https://tc39.es/ecma262/#sec-module-namespace-exotic-objects-get-p-receiver */
  * Get(P, Receiver) {
    const O = this;

    // 1. Assert: IsPropertyKey(P) is true.
    Assert(IsPropertyKey(P));
    // 2. If Type(P) is Symbol, then
    if (surroundingAgent.feature('import-defer') ? IsSymbolLikeNamespaceKey(P, O) : P instanceof SymbolValue) {
      // a. Return ? OrdinaryGet(O, P, Receiver).
      return yield* OrdinaryGet(O, P, Receiver);
    }
    let exports;
    if (surroundingAgent.feature('import-defer')) {
      exports = Q(yield* GetModuleExportsList(O));
    } else {
      // 3. Let exports be O.[[Exports]].
      exports = O.Exports;
    }
    // 4. If P is not an element of exports, return undefined.
    if (!exports.has(P as JSStringValue)) {
      return Value.undefined;
    }
    // 5. Let m be O.[[Module]].
    const m = O.Module;
    // 6. Let binding be ! m.ResolveExport(P).
    const binding = m.ResolveExport(P as JSStringValue);
    // 7. Assert: binding is a ResolvedBinding Record.
    Assert(binding instanceof ResolvedBindingRecord);
    // 8. Let targetModule be binding.[[Module]].
    const targetModule = binding.Module;
    // 9. Assert: targetModule is not undefined.
    Assert(!(targetModule instanceof UndefinedValue));
    // 10. If binding.[[BindingName]] is ~namespace~, then
    if (binding.BindingName === 'namespace') {
      // a. Return ? GetModuleNamespace(targetModule).
      return Q(GetModuleNamespace(targetModule, /* [import-defer] */ 'evaluation'));
    }
    // 11. Let targetEnv be targetModule.[[Environment]].
    const targetEnv = targetModule.Environment;
    // 12. If targetEnv is undefined, throw a ReferenceError exception.
    if (!targetEnv) {
      return surroundingAgent.Throw('ReferenceError', 'NotDefined', P);
    }
    // 13. Return ? targetEnv.GetBindingValue(binding.[[BindingName]], true).
    return Q(yield* targetEnv.GetBindingValue(binding.BindingName, Value.true));
  },
  * Set() {
    return Value.false;
  },
  * Delete(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    if (surroundingAgent.feature('import-defer') ? IsSymbolLikeNamespaceKey(P, O) : P instanceof SymbolValue) {
      return Q(yield* OrdinaryDelete(O, P));
    }
    let exports;
    if (surroundingAgent.feature('import-defer')) {
      exports = Q(yield* GetModuleExportsList(O));
    } else {
      exports = O.Exports;
    }
    if (exports.has(P as JSStringValue)) {
      return Value.false;
    }
    return Value.true;
  },
  * OwnPropertyKeys() {
    const O = this;

    let exports;
    if (surroundingAgent.feature('import-defer')) {
      exports = Q(yield* GetModuleExportsList(O));
      if (O.Deferred && exports.has('then')) {
        exports = [...exports].filter((x) => x.stringValue() !== 'then');
      }
    } else {
      exports = O.Exports;
    }

    const symbolKeys = X(OrdinaryOwnPropertyKeys(O));
    return [...exports, ...symbolKeys];
  },
} satisfies Partial<ObjectInternalMethods<ModuleNamespaceObject>>;

/** https://tc39.es/ecma262/#sec-modulenamespacecreate */
export function ModuleNamespaceCreate(
  module: AbstractModuleRecord,
  exports: readonly JSStringValue[],
  /* [import-defer] */ phase: 'defer' | 'evaluation',
): ModuleNamespaceObject {
  if (!surroundingAgent.feature('import-defer')) {
    // 1. Assert: module.[[Namespace]] is EMPTY.
    Assert(module.Namespace === undefined);
  }
  // 2. Let internalSlotsList be the internal slots listed in Table 31.
  const internalSlotsList = ['Module', 'Exports'];
  // 3. Let M be MakeBasicObject(internalSlotsList).
  const M = MakeBasicObject(internalSlotsList) as Mutable<ModuleNamespaceObject>;
  // 4. Set M's essential internal methods to the definitions specified in 10.4.6.
  /** https://tc39.es/ecma262/#sec-module-namespace-exotic-objects */
  M.GetPrototypeOf = InternalMethods.GetPrototypeOf;
  M.SetPrototypeOf = InternalMethods.SetPrototypeOf;
  M.IsExtensible = InternalMethods.IsExtensible;
  M.PreventExtensions = InternalMethods.PreventExtensions;
  M.GetOwnProperty = InternalMethods.GetOwnProperty;
  M.DefineOwnProperty = InternalMethods.DefineOwnProperty;
  M.HasProperty = InternalMethods.HasProperty;
  M.Get = InternalMethods.Get;
  M.Set = InternalMethods.Set;
  M.Delete = InternalMethods.Delete;
  M.OwnPropertyKeys = InternalMethods.OwnPropertyKeys;
  // 5. Set M.[[Module]] to module.
  M.Module = module;
  // 6. Let sortedExports be a List whose elements are the elements of exports, sorted according to lexicographic code unit order.
  const sortedExports = [...exports].sort((x, y) => {
    const result = X(CompareArrayElements(x, y, Value.undefined));
    return R(result);
  });
  // 7. Set M.[[Exports]] to sortedExports.
  M.Exports = new JSStringSet(sortedExports);
  if (!surroundingAgent.feature('import-defer')) {
    // 8. Create own properties of M corresponding to the definitions in 26.3.
    M.properties.set(wellKnownSymbols.toStringTag, Descriptor({
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.false,
      Value: Value('Module'),
    }));
    // 9. Set module.[[Namespace]] to M.
    (module as Mutable<AbstractModuleRecord>).Namespace = M;
  } else {
    /** https://tc39.es/proposal-defer-import-eval/#sec-modulenamespacecreate */

    let toStringTag: JSStringValue;
    // 9. If phase is defer, then
    if (phase === 'defer') {
      // a. Assert: module.[[DeferredNamespace]] is empty.
      Assert(module.DeferredNamespace === undefined);
      // b. Set module.[[DeferredNamespace]] to M.
      (module as Mutable<AbstractModuleRecord>).DeferredNamespace = M;
      // c. Set M.[[Deferred]] to true.
      M.Deferred = true;
      // d. Let toStringTag be "Deferred Module".
      toStringTag = Value('Deferred Module');
    } else { // 10. Else,
      // a. Assert: module.[[Namespace]] is empty.
      Assert(module.Namespace === undefined);
      // b. Set module.[[Namespace]] to M.
      (module as Mutable<AbstractModuleRecord>).Namespace = M;
      // c. Set M.[[Deferred]] to false.
      M.Deferred = false;
      // d. Let toStringTag be "Module".
      toStringTag = Value('Module');
    }
    // 11. Create an own data property of M named %Symbol.toStringTag% whose [[Value]] is toStringTag whose [[Writable]], [[Enumerable]], and [[Configurable]] attributes are false.
    M.properties.set(wellKnownSymbols.toStringTag, Descriptor({
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.false,
      Value: toStringTag,
    }));
  }
  // 10. Return M.
  return M;
}

/* [import-defer] */
/** https://tc39.es/proposal-defer-import-eval/#sec-IsSymbolLikeNamespaceKey */
function IsSymbolLikeNamespaceKey(P: PropertyKeyValue, ns: ModuleNamespaceObject): P is SymbolValue {
  if (P instanceof SymbolValue) {
    return true;
  }
  if (ns.Deferred && P.stringValue() === 'then') {
    return true;
  }
  return false;
}

/* [import-defer] */
/** https://tc39.es/proposal-defer-import-eval/#sec-GetModuleExportsList */
function* GetModuleExportsList(O: ModuleNamespaceObject): PlainEvaluator<JSStringSet> {
  if (O.Deferred) {
    const m = O.Module;
    if (ReadyForSyncExecution(m) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'DeferredModuleNotReady', m);
    }
    Q(yield* EvaluateModuleSync(m));
  }
  return O.Exports;
}

/* [import-defer] */
/** https://tc39.es/proposal-defer-import-eval/#sec-ReadyForSyncExecution */
export function ReadyForSyncExecution(module: ModuleRecord, seen?: Set<CyclicModuleRecord>): BooleanValue {
  if (!(module instanceof CyclicModuleRecord)) {
    return Value.true;
  }
  seen ??= new Set();
  if (seen.has(module)) {
    return Value.true;
  }
  seen.add(module);
  if (module.Status === 'evaluated') {
    return Value.true;
  }
  if (module.Status === 'evaluating' || module.Status === 'evaluating-async') {
    return Value.false;
  }
  Assert(module.Status === 'linked');
  if (module.HasTLA === Value.true) {
    return Value.false;
  }
  for (const request of module.RequestedModules) {
    const requiredModule = GetImportedModule(module, request);
    if (ReadyForSyncExecution(requiredModule, seen) === Value.false) {
      return Value.false;
    }
  }
  return Value.true;
}
