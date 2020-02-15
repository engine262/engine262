import { surroundingAgent } from '../engine.mjs';
import { Q, X } from '../completion.mjs';
import { AbstractModuleRecord, ResolvedBindingRecord } from '../modules.mjs';
import {
  Type,
  Value,
  Descriptor,
  wellKnownSymbols,
} from '../value.mjs';
import { ValueSet } from '../helpers.mjs';
import {
  Assert,
  SortCompare,
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
} from './all.mjs';


function ModuleNamespaceSetPrototypeOf(V) {
  const O = this;

  return Q(SetImmutablePrototype(O, V));
}

function ModuleNamespaceIsExtensible() {
  return Value.false;
}

function ModuleNamespacePreventExtensions() {
  return Value.true;
}

function ModuleNamespaceGetOwnProperty(P) {
  const O = this;

  if (Type(P) === 'Symbol') {
    return OrdinaryGetOwnProperty(O, P);
  }
  const exports = O.Exports;
  if (!exports.has(P)) {
    return Value.undefined;
  }
  const value = Q(O.Get(P, O));
  return Descriptor({
    Value: value,
    Writable: Value.true,
    Enumerable: Value.true,
    Configurable: Value.false,
  });
}

function ModuleNamespaceDefineOwnProperty(P, Desc) {
  const O = this;

  if (Type(P) === 'Symbol') {
    return OrdinaryDefineOwnProperty(O, P, Desc);
  }

  const current = Q(O.GetOwnProperty(P));
  if (current === Value.undefined) {
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
    return SameValue(Desc.Value, current.Value);
  }
  return Value.true;
}

function ModuleNamespaceHasProperty(P) {
  const O = this;

  if (Type(P) === 'Symbol') {
    return OrdinaryHasProperty(O, P);
  }
  const exports = O.Exports;
  if (exports.has(P)) {
    return Value.true;
  }
  return Value.false;
}

function ModuleNamespaceGet(P, Receiver) {
  const O = this;

  Assert(IsPropertyKey(P));
  if (Type(P) === 'Symbol') {
    return OrdinaryGet(O, P, Receiver);
  }
  const exports = O.Exports;
  if (!exports.has(P)) {
    return Value.undefined;
  }
  const m = O.Module;
  const binding = m.ResolveExport(P);
  Assert(binding instanceof ResolvedBindingRecord);
  const targetModule = binding.Module;
  Assert(targetModule !== Value.undefined);
  const targetEnv = targetModule.Environment;
  if (targetEnv === Value.undefined) {
    return surroundingAgent.Throw('ReferenceError', 'NotDefined', P);
  }
  const targetEnvRec = targetEnv.EnvironmentRecord;
  return Q(targetEnvRec.GetBindingValue(binding.BindingName, Value.true));
}

function ModuleNamespaceSet() {
  return Value.false;
}

function ModuleNamespaceDelete(P) {
  const O = this;

  Assert(IsPropertyKey(P));
  if (Type(P) === 'Symbol') {
    return Q(OrdinaryDelete(O, P));
  }
  const exports = O.Exports;
  if (exports.has(P)) {
    return Value.false;
  }
  return Value.true;
}

function ModuleNamespaceOwnPropertyKeys() {
  const O = this;

  const exports = [...O.Exports];
  const symbolKeys = X(OrdinaryOwnPropertyKeys(O));
  exports.push(...symbolKeys);
  return exports;
}

// 9.4.6.11 #sec-modulenamespacecreate
export function ModuleNamespaceCreate(module, exports) {
  // 1. Assert: module is a Module Record.
  Assert(module instanceof AbstractModuleRecord);
  // 2. Assert: module.[[Namespace]] is undefined.
  Assert(module.Namespace === Value.undefined);
  // 3. Assert: exports is a List of String values.
  Assert(Array.isArray(exports));
  // 4. Let internalSlotsList be the internal slots listed in Table 31.
  const internalSlotsList = ['Module', 'Exports', 'Prototype'];
  // 5. Let M be ! MakeBasicObject(internalSlotsList).
  const M = X(MakeBasicObject(internalSlotsList));
  // 6. Set M's essential internal methods to the definitions specified in #sec-module-namespace-exotic-objects
  M.SetPrototypeOf = ModuleNamespaceSetPrototypeOf;
  M.IsExtensible = ModuleNamespaceIsExtensible;
  M.PreventExtensions = ModuleNamespacePreventExtensions;
  M.GetOwnProperty = ModuleNamespaceGetOwnProperty;
  M.DefineOwnProperty = ModuleNamespaceDefineOwnProperty;
  M.HasProperty = ModuleNamespaceHasProperty;
  M.Get = ModuleNamespaceGet;
  M.Set = ModuleNamespaceSet;
  M.Delete = ModuleNamespaceDelete;
  M.OwnPropertyKeys = ModuleNamespaceOwnPropertyKeys;
  // 7. Set M.[[Prototype]] to null.
  M.Prototype = Value.null;
  // 8. Set M.[[Module]] to module.
  M.Module = module;
  // 9. Let sortedExports be a new List containing the same values as the list exports where the values are ordered as if an Array of the same values had been sorted using Array.prototype.sort using undefined as comparefn.
  const sortedExports = [...exports].sort((x, y) => {
    const result = X(SortCompare(x, y, Value.undefined));
    return result.numberValue();
  });
  // 10. Set M.[[Exports]] to sortedExports.
  M.Exports = new ValueSet(sortedExports);
  // 11. Create own properties of M corresponding to the definitions in 26.3.
  M.properties.set(wellKnownSymbols.toStringTag, Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
    Value: new Value('Module'),
  }));
  // 12. Set module.[[Namespace]] to M.
  module.Namespace = M;
  // 13. Return M;
  return M;
}
