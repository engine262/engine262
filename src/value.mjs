import {
  ExecutionContext,
  isArrayIndex,
  surroundingAgent,
} from './engine.mjs';
import {
  ArraySetLength,
  Assert,
  Call,
  CreateListFromArrayLike,
  CompletePropertyDescriptor,
  FromPropertyDescriptor,
  Get,
  GetMethod,
  HasOwnProperty,
  IsAccessorDescriptor,
  IsCompatiblePropertyDescriptor,
  IsDataDescriptor,
  IsExtensible,
  IsPropertyKey,
  OrdinaryDefineOwnProperty,
  OrdinaryDelete,
  OrdinaryGet,
  OrdinaryGetOwnProperty,
  OrdinaryGetPrototypeOf,
  OrdinaryHasProperty,
  OrdinaryIsExtensible,
  OrdinaryOwnPropertyKeys,
  OrdinaryPreventExtensions,
  OrdinarySet,
  OrdinarySetPrototypeOf,
  SameValue,
  StringGetOwnProperty,
  ToBoolean,
  ToPropertyDescriptor,
  ToString,
  ToUint32,
} from './abstract-ops/all.mjs';
import { EnvironmentRecord, LexicalEnvironment } from './environment.mjs';
import { Q, X, Completion } from './completion.mjs';
import { outOfRange } from './helpers.mjs';

export class Value {}

export class PrimitiveValue extends Value {}

export class UndefinedValue extends PrimitiveValue {}

export class NullValue extends PrimitiveValue {}

export class BooleanValue extends PrimitiveValue {
  constructor(boolean) {
    super();
    this.boolean = boolean;
  }

  isTrue() {
    return this === trueValue;
  }

  isFalse() {
    return this === falseValue;
  }
}

export class NumberValue extends PrimitiveValue {
  constructor(number) {
    super();
    this.number = number;
  }

  numberValue() {
    return this.number;
  }

  isNaN() {
    return Number.isNaN(this.number);
  }

  isInfinity() {
    return !Number.isFinite(this.number) && !this.isNaN();
  }
}

export class StringValue extends PrimitiveValue {
  constructor(string) {
    super();
    this.string = string;
  }

  stringValue() {
    return this.string;
  }
}

export class SymbolValue extends PrimitiveValue {
  constructor(Description) {
    super();
    this.Description = Description;
  }
}

export const wellKnownSymbols = Object.create(null);
for (const name of [
  'asyncIterator',
  'hasInstance',
  'isConcatSpreadable',
  'iterator',
  'match',
  'replace',
  'search',
  'species',
  'split',
  'toPrimitive',
  'toStringTag',
  'unscopables',
]) {
  const sym = new SymbolValue(new StringValue(`Symbol.${name}`));
  wellKnownSymbols[name] = sym;
}
Object.freeze(wellKnownSymbols);


export class ObjectValue extends Value {
  constructor() {
    super();

    this.Prototype = undefined;
    this.Extensible = undefined;
    this.IsClassPrototype = false;
    this.properties = new Map();
  }

  GetPrototypeOf() {
    return OrdinaryGetPrototypeOf(this);
  }

  SetPrototypeOf(V) {
    return OrdinarySetPrototypeOf(this, V);
  }

  IsExtensible() {
    return OrdinaryIsExtensible(this);
  }

  PreventExtensions() {
    return OrdinaryPreventExtensions(this);
  }

  GetOwnProperty(P) {
    return OrdinaryGetOwnProperty(this, P);
  }

  DefineOwnProperty(P, Desc) {
    return OrdinaryDefineOwnProperty(this, P, Desc);
  }

  HasProperty(P) {
    return OrdinaryHasProperty(this, P);
  }

  Get(P, Receiver) {
    return OrdinaryGet(this, P, Receiver);
  }

  Set(P, V, Receiver) {
    return OrdinarySet(this, P, V, Receiver);
  }

  Delete(P) {
    return OrdinaryDelete(this, P);
  }

  OwnPropertyKeys() {
    return OrdinaryOwnPropertyKeys(this);
  }
}

export class ArrayExoticObjectValue extends ObjectValue {
  DefineOwnProperty(P, Desc) {
    const A = this;

    Assert(IsPropertyKey(P));
    if (Type(P) === 'String' && P.stringValue() === 'length') {
      return Q(ArraySetLength(A, Desc));
    }
    if (isArrayIndex(P)) {
      const oldLenDesc = OrdinaryGetOwnProperty(A, New('length'));
      Assert(Type(oldLenDesc) !== 'Undefined' && !IsAccessorDescriptor(oldLenDesc));
      const oldLen = oldLenDesc.Value;
      const index = X(ToUint32(P));
      if (index.numberValue() >= oldLen.numberValue() && oldLenDesc.Writable === false) {
        return New(false);
      }
      const succeeded = X(OrdinaryDefineOwnProperty(A, P, Desc));
      if (succeeded.isFalse()) {
        return New(false);
      }
      if (index.numberValue() >= oldLen.numberValue()) {
        oldLenDesc.Value = New(index.numberValue() + 1);
        const succeeded = OrdinaryDefineOwnProperty(A, New('length'), oldLenDesc); // eslint-disable-line no-shadow
        Assert(succeeded.isTrue());
      }
      return New(true);
    }
    return OrdinaryDefineOwnProperty(A, P, Desc);
  }
}

export class FunctionValue extends ObjectValue {}

function nativeCall(F, argumentsList, thisArgument, newTarget) {
  // Fill in "required" properties
  argumentsList.callLength = argumentsList.length;
  const length = New('length');
  if (F.properties.has(length)) {
    const len = F.properties.get(length).Value.numberValue();
    for (let i = 0; i < len; i += 1) {
      if (argumentsList[i] === undefined) {
        argumentsList[i] = undefinedValue;
      }
    }
  }

  return F.nativeFunction(argumentsList, {
    thisValue: thisArgument || undefinedValue,
    NewTarget: newTarget || undefinedValue,
  });
}

export class BuiltinFunctionValue extends FunctionValue {
  constructor(nativeFunction) {
    // Unless otherwise specified every built-in function object has the
    // %FunctionPrototype% object as the initial value of its [[Prototype]]
    // internal slot.
    super();
    this.nativeFunction = nativeFunction;
    // Will be filled in CreateBuiltinFunction.
    this.Realm = undefined;
    this.ScriptOrModule = undefined;
  }

  Call(thisArgument, argumentsList) {
    const F = this;

    // const callerContext = surroundingAgent.runningExecutionContext;
    // If callerContext is not already suspended, suspend callerContext.
    const calleeContext = new ExecutionContext();
    calleeContext.Function = F;
    const calleeRealm = F.Realm;
    calleeContext.Realm = calleeRealm;
    calleeContext.ScriptOrModule = F.ScriptOrModule;
    // 8. Perform any necessary implementation-defined initialization of calleeContext.
    surroundingAgent.executionContextStack.push(calleeContext);
    const result = nativeCall(F, argumentsList, thisArgument, undefined);
    // Remove calleeContext from the execution context stack and
    // restore callerContext as the running execution context.
    surroundingAgent.executionContextStack.pop();
    return result;
  }

  Construct(argumentsList, newTarget) {
    const F = this;

    // const callerContext = surroundingAgent.runningExecutionContext;
    // If callerContext is not already suspended, suspend callerContext.
    const calleeContext = new ExecutionContext();
    calleeContext.Function = F;
    const calleeRealm = F.Realm;
    calleeContext.Realm = calleeRealm;
    calleeContext.ScriptOrModule = F.ScriptOrModule;
    // 8. Perform any necessary implementation-defined initialization of calleeContext.
    surroundingAgent.executionContextStack.push(calleeContext);
    const result = nativeCall(F, argumentsList, undefined, newTarget);
    // Remove calleeContext from the execution context stack and
    // restore callerContext as the running execution context.
    surroundingAgent.executionContextStack.pop();
    return result;
  }
}

export class ProxyExoticObjectValue extends ObjectValue {
  constructor() {
    super();

    this.ProxyTarget = undefined;
    this.ProxyHandler = undefined;
  }

  GetPrototypeOf() {
    const O = this;
    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform getPrototypeOf on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, New('getPrototypeOf')));
    if (Type(trap) === 'Undefined') {
      return Q(target.GetPrototypeOf());
    }
    const handlerProto = Q(Call(trap, handler, [target]));
    if (Type(handlerProto) !== 'Object' && Type(handlerProto) !== 'Null') {
      return surroundingAgent.Throw('TypeError');
    }
    const extensibleTarget = Q(IsExtensible(target));
    if (extensibleTarget === true) {
      return handlerProto;
    }
    const targetProto = Q(target.GetPrototypeOf());
    if (SameValue(handlerProto, targetProto) === false) {
      return surroundingAgent.Throw('TypeError');
    }
    return handlerProto;
  }

  SetPrototypeOf(V) {
    const O = this;

    Assert(Type(V) === 'Object' || Type(V) === 'Null');
    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform setPrototypeOf on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, New('setPrototypeOf')));
    if (Type(trap) === 'Undefined') {
      return Q(target.SetPrototypeOf(V));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, V])));
    if (booleanTrapResult.isFalse()) {
      return false;
    }
    const extensibleTarget = Q(IsExtensible(target));
    if (extensibleTarget === true) {
      return true;
    }
    const targetProto = Q(target.GetPrototypeOf());
    if (SameValue(V, targetProto)) {
      return surroundingAgent.Throw('TypeError');
    }
    return true;
  }

  IsExtensible() {
    const O = this;

    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform isExtensible on proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, New('isExtensible')));
    if (Type(trap) === 'Undefined') {
      return Q(target.IsExtensible());
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target])));
    const targetResult = Q(target.IsExtensible());
    if (SameValue(booleanTrapResult, targetResult) === false) {
      return surroundingAgent.Throw('TypeError');
    }
    return booleanTrapResult;
  }

  PreventExtensions() {
    const O = this;

    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform preventExtensions on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, New('preventExtensions')));
    if (Type(trap) === 'Undefined') {
      return Q(target.PreventExtensions());
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target])));
    if (booleanTrapResult.isTrue()) {
      const targetIsExtensible = Q(target.IsExtensible());
      if (targetIsExtensible === true) {
        return surroundingAgent.Throw('TypeError');
      }
    }
    return booleanTrapResult;
  }

  GetOwnProperty(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform getOwnPropertyDescriptor on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, New('getOwnPropertyDescriptor')));
    if (Type(trap) === 'Undefined') {
      return Q(target.GetOwnProperty(P));
    }
    const trapResultObj = Q(Call(trap, handler, [target, P]));
    if (Type(trapResultObj) !== 'Object' || Type(trapResultObj) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError');
    }
    const targetDesc = Q(target.GetOwnProperty(P));
    if (Type(trapResultObj) === 'Undefined') {
      if (Type(targetDesc) === 'Undefined') {
        return New(undefined);
      }
      if (targetDesc.Configurable === false) {
        return surroundingAgent.Throw('TypeError');
      }
      const extensibleTarget = Q(IsExtensible(target));
      Assert(Type(extensibleTarget) === 'Boolean');
      if (extensibleTarget.isFalse()) {
        return surroundingAgent.Throw('TypeError');
      }
      return New(undefined);
    }
    const extensibleTarget = Q(IsExtensible(target));
    const resultDesc = Q(ToPropertyDescriptor(trapResultObj));
    CompletePropertyDescriptor(resultDesc);
    const valid = IsCompatiblePropertyDescriptor(extensibleTarget, resultDesc, targetDesc);
    if (valid.isFalse()) {
      return surroundingAgent.Throw('TypeError');
    }
    if (resultDesc.Configurable === false) {
      if (Type(targetDesc) === 'Undefined' || targetDesc.Configurable === true) {
        return surroundingAgent.Throw('TypeError');
      }
    }
    return resultDesc;
  }

  DefineOwnProperty(P, Desc) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform defineProperty on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, New('defineProperty')));
    if (Type(trap) === 'Undefined') {
      return Q(target.DefineOwnProperty(P, Desc));
    }
    const descObj = FromPropertyDescriptor(Desc);
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P, descObj])));
    if (booleanTrapResult.isFalse()) {
      return New(false);
    }
    const targetDesc = Q(target.GetOwnProperty(P));
    const extensibleTarget = Q(IsExtensible(target));
    let settingConfigFalse;
    if ('Configurable' in Desc && Desc.Configurable === false) {
      settingConfigFalse = true;
    } else {
      settingConfigFalse = false;
    }
    if (Type(targetDesc) === 'Undefined') {
      if (extensibleTarget.isFalse()) {
        return surroundingAgent.Throw('TypeError');
      }
      if (settingConfigFalse) {
        return surroundingAgent.Throw('TypeError');
      }
    } else if (Type(targetDesc) !== 'Undefined') {
      if (IsCompatiblePropertyDescriptor(extensibleTarget, Desc, targetDesc).isFalse()) {
        return surroundingAgent.Throw('TypeError');
      }
      if (settingConfigFalse && targetDesc.Configurable === true) {
        return surroundingAgent.Throw('TypeError');
      }
    }
    return New(true);
  }

  HasProperty(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform has on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(target, New('has')));
    if (Type(trap) === 'Undefined') {
      return Q(target.HasProperty(P));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P])));
    if (booleanTrapResult.isFalse()) {
      const targetDesc = Q(target.GetOwnProperty(P));
      if (Type(targetDesc) !== 'Undefined') {
        if (targetDesc.Configurable === false) {
          return surroundingAgent.Throw('TypeError');
        }
        const extensibleTarget = Q(IsExtensible(target));
        if (extensibleTarget.isFalse()) {
          return surroundingAgent.Throw('TypeError');
        }
      }
    }
    return booleanTrapResult;
  }

  Get(P, Receiver) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform get on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, New('get')));
    if (Type(trap) === 'Undefined') {
      return Q(target.Get(P, Receiver));
    }
    const trapResult = Q(Call(trap, handler, [target, P, Receiver]));
    const targetDesc = Q(target.GetOwnProperty(P));
    if (Type(targetDesc) !== 'Undefined' && targetDesc.Configurable === false) {
      if (IsDataDescriptor(targetDesc).isTrue() && targetDesc.Writable === false) {
        if (SameValue(trapResult, targetDesc.Value) === false) {
          return surroundingAgent.Throw('TypeError');
        }
      }
      if (IsAccessorDescriptor(targetDesc).isTrue() && Type(targetDesc.Get) === 'Undefined') {
        if (Type(trapResult) === 'Undefined') {
          return surroundingAgent.Throw('TypeError');
        }
      }
    }
    return trapResult;
  }

  Set(P, V, Receiver) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform set on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, New('set')));
    if (Type(trap) === 'Undefined') {
      return Q(target.Set(P, V, Receiver));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P, Receiver])));
    if (booleanTrapResult.isFalse()) {
      return New(false);
    }
    const targetDesc = Q(target.GetOwnProperty(P));
    if (Type(targetDesc) !== 'Undefined' && targetDesc.Configurable === false) {
      if (IsDataDescriptor(targetDesc).isTrue() && targetDesc.Writable === false) {
        if (SameValue(V, targetDesc.Value) === false) {
          return surroundingAgent.Throw('TypeError');
        }
      }
      if (IsAccessorDescriptor(targetDesc).isTrue()) {
        if (Type(targetDesc.Set) === 'Undefined') {
          return surroundingAgent.Throw('TypeError');
        }
      }
    }
    return New(true);
  }

  Delete(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform deleteProperty on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, New('deleteProperty')));
    if (Type(trap) === 'Undefined') {
      return Q(target.Delete(P));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P])));
    if (booleanTrapResult.isFalse()) {
      return falseValue;
    }
    const targetDesc = Q(target.GetOwnProperty(P));
    if (Type(targetDesc) === 'Undefined') {
      return trueValue;
    }
    if (targetDesc.Configurable === false) {
      return surroundingAgent.Throw('TypeError');
    }
    return trueValue;
  }

  OwnPropertyKeys() {
    const O = this;

    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError', 'cannot perform ownKeys on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, New('ownKeys')));
    if (Type(trap) === 'Undefined') {
      return Q(target.OwnPropertyKeys());
    }
    const trapResultArray = Q(Call(trap, handler, [target]));
    const trapResult = Q(CreateListFromArrayLike(trapResultArray, ['String', 'Symbol']));
    if (trapResult.some((e) => trapResult.indexOf(e) !== trapResult.lastIndexOf(e))) {
      return surroundingAgent.Throw('TypeError');
    }
    const extensibleTarget = Q(IsExtensible(target));
    const targetKeys = Q(target.OwnPropertyKeys());
    // Assert: targetKeys is a List containing only String and Symbol values.
    // Assert: targetKeys contains no duplicate entries.
    const targetConfigurableKeys = [];
    const targetNonconfigurableKeys = [];
    for (const key of targetKeys) {
      const desc = Q(target.GetOwnProperty(key));
      if (Type(desc) !== 'Undefined' && desc.Configurable === false) {
        targetNonconfigurableKeys.push(key);
      } else {
        targetConfigurableKeys.push(key);
      }
    }
    if (extensibleTarget.isTrue() && targetNonconfigurableKeys.length === 0) {
      return trapResult;
    }
    const uncheckedResultKeys = [...trapResult];
    for (const key of targetNonconfigurableKeys) {
      if (!uncheckedResultKeys.includes(key)) {
        return surroundingAgent.Throw('TypeError', 'ownKeys trap result does not include non-configurable key');
      }
      uncheckedResultKeys.splice(uncheckedResultKeys.indexOf(key), 1);
    }
    if (extensibleTarget.isTrue()) {
      return trapResult;
    }
    for (const key of targetConfigurableKeys) {
      if (!uncheckedResultKeys.includes(key)) {
        return surroundingAgent.Throw('TypeError');
      }
      uncheckedResultKeys.splice(uncheckedResultKeys.indexOf(key), 1);
    }
    return trapResult;
  }
}

export class StringExoticObjectValue extends ObjectValue {
  GetOwnProperty(P) {
    const S = this;
    Assert(IsPropertyKey(P));
    const desc = OrdinaryGetOwnProperty(S, P);
    if (Type(desc) !== 'Undefined') {
      return desc;
    }
    return X(StringGetOwnProperty(S, P));
  }

  DefineOwnProperty(P, Desc) {
    const S = this;
    Assert(IsPropertyKey(P));
    const stringDesc = X(StringGetOwnProperty(S, P));
    if (Type(stringDesc) !== 'Undefined') {
      const extensible = S.Extensible;
      return X(IsCompatiblePropertyDescriptor(extensible, Desc, stringDesc));
    }
    return X(OrdinaryDefineOwnProperty(S, P, Desc));
  }

  OwnPropertyKeys() {
    const O = this;
    const keys = [];
    const str = O.StringData.stringValue();
    const len = str.length;
    for (let i = 0; i < len; i += 1) {
      keys.push(X(ToString(New(i))));
    }
    for (const key of O.properties.keys()) {
      if (Type(key) === 'String') {
        const int = Number.parseInt(key.stringValue(), 10);
        if (int > 0 && int < (2 ** 53) - 1) {
          // nothing
        } else {
          keys.push(key);
        }
      } else if (Type(key) === 'Symbol') {
        keys.push(key);
      }
    }
  }
}

// #sec-set-immutable-prototype
function SetImmutablePrototype(O, V) {
  Assert(Type(V) === 'Object' || Type(V) === 'Null');
  const current = Q(O.GetPrototypeOf());
  if (SameValue(V, current)) {
    return New(true);
  }
  return New(false);
}

export class ModuleNamespaceExoticObjectValue extends ObjectValue {
  constructor() {
    super();
    this.Module = null;
    this.Exports = [];
    this.Prototype = New(null);
  }

  SetPrototypeOf(V) {
    const O = this;

    return Q(SetImmutablePrototype(O, V));
  }

  IsExtensible() {
    return New(false);
  }

  PreventExtensions() {
    return New(true);
  }

  GetOwnProperty(P) {
    const O = this;

    if (Type(P) === 'Symbol') {
      return OrdinaryGetOwnProperty(O, P);
    }
    const exports = O.Exports;
    if (!exports.includes(P)) {
      return New(undefined);
    }
    const value = Q(O.Get(P, O));
    return {
      Value: value,
      Writable: true,
      Enumerable: true,
      Configurable: true,
    };
  }

  DefineOwnProperty(P, Desc) {
    const O = this;

    if (Type(P) === 'Symbol') {
      return OrdinaryDefineOwnProperty(O, P, Desc);
    }

    const current = O.GetOwnProperty(P);
    if (Type(current) === 'Undefined') {
      return New(false);
    }
    if (IsAccessorDescriptor(Desc).isTrue()) {
      return New(false);
    }
    if ('Writable' in Desc && Desc.Writable === false) {
      return New(false);
    }
    if ('Enumerable' in Desc && Desc.Enumerable === false) {
      return New(false);
    }
    if ('Configurable' in Desc && Desc.Configurable === true) {
      return New(true);
    }
    if ('Value' in Desc && SameValue(Desc.Value, current.Value)) {
      return New(false);
    }
    return New(true);
  }

  HasProperty(P) {
    const O = this;

    if (Type(P) === 'Symbol') {
      return OrdinaryHasProperty(O, P);
    }
    const exports = O.Exports;
    if (exports.includes(P)) {
      return New(true);
    } else {
      return New(false);
    }
  }

  Get(P, Receiver) {
    const O = this;

    Assert(IsPropertyKey(P));
    if (Type(P) === 'Symbol') {
      return OrdinaryGet(O, P, Receiver);
    }
    const exports = O.Exports;
    if (!exports.includes(P)) {
      return New(undefined);
    }
    const m = O.Module;
    const binding = m.ResolveExport(P, []);
    // Assert: binding is a ResolvedBinding Record.
    const targetModule = binding.Module;
    Assert(Type(targetModule) !== 'Undefined');
    const targetEnv = targetModule.Environment;
    if (Type(targetEnv) === 'Undefined') {
      return surroundingAgent.Throw('ReferenceError', `${P.stringValue()} is not defined`);
    }
    const targetEnvRec = targetEnv.EnvironmentRecord;
    return Q(targetEnvRec.GetBindingValue(binding.BindingName, New(true)));
  }

  Set() {
    return New(false);
  }

  Delete(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    if (Type(P) === 'Symbol') {
      return OrdinaryDelete(O, P);
    }
    const exports = O.Exports;
    if (exports.includes(P)) {
      return New(false);
    }
    return New(true);
  }

  OwnPropertyKeys() {
    const O = this;

    const exports = [...O.Exports];
    const symbolKeys = X(OrdinaryOwnPropertyKeys(O));
    exports.push(...symbolKeys);
    return exports;
  }
}

export class ArgumentsExoticObjectValue extends ObjectValue {
  constructor(...args) {
    super(...args);

    this.ParameterMap = undefined;
  }

  GetOwnProperty(P) {
    const args = this;
    const desc = OrdinaryGetOwnProperty(args, P);
    if (Type(desc) === 'Undefined') {
      return desc;
    }
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    if (isMapped.isTrue()) {
      desc.Value = Get(map, P);
    }
    return desc;
  }

  DefineOwnProperty(P, Desc) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = HasOwnProperty(map, P);
    let newArgDesc = Desc;
    if (isMapped.isTrue() && IsDataDescriptor(Desc).isTrue()) {
      if (!('Value' in Desc) && 'Writable' in Desc && Desc.Writable === false) {
        newArgDesc = { ...Desc };
        newArgDesc.Value = Get(map, P);
      }
    }
    const allowed = Q(OrdinaryDefineOwnProperty(args, P, newArgDesc));
    if (allowed.isFalse()) {
      return New(false);
    }
    if (isMapped.isTrue()) {
      if (IsAccessorDescriptor(Desc).isTrue()) {
        map.Delete(P);
      } else {
        if ('Value' in Desc) {
          const setStatus = Set(map, P, Desc.Value, New(false));
          Assert(setStatus.isTrue());
        }
        if ('Writable' in Desc && Desc.Writable === false) {
          map.Delete(P);
        }
      }
    }
    return New(true);
  }

  Get(P, Receiver) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    if (isMapped.isFalse()) {
      return Q(OrdinaryGet(args, P, Receiver));
    } else {
      return Get(map, P);
    }
  }

  Set(P, V, Receiver) {
    const args = this;
    let isMapped;
    let map;
    if (SameValue(args, Receiver) === false) {
      isMapped = false;
    } else {
      map = args.ParameterMap;
      isMapped = X(HasOwnProperty(map, P)).isTrue();
    }
    if (isMapped) {
      const setStatus = Set(map, P, V, New(false));
      Assert(setStatus.isTrue());
    }
    return Q(OrdinarySet(args, P, V, Receiver));
  }

  Delete(P) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    const result = Q(OrdinaryDelete(map, P));
    if (result.isTrue() && isMapped.isTrue()) {
      map.Delete(P);
    }
    return result;
  }
}

export class Reference {
  constructor(
    BaseValue,
    ReferencedName,
    StrictReference,
  ) {
    this.BaseValue = BaseValue;
    this.ReferencedName = ReferencedName;
    this.StrictReference = StrictReference;
  }
}

export class SuperReference extends Reference {
  constructor(BaseValue, ReferencedName, thisValue, StrictReference) {
    super(BaseValue, ReferencedName, StrictReference);
    this.thisValue = thisValue;
  }
}

const undefinedValue = new UndefinedValue();
const nullValue = new NullValue();
const trueValue = new BooleanValue(true);
const falseValue = new BooleanValue(false);

// TODO(devsnek): clean this up somehow
const stringMap = new Map();
const numberMap = new Map();

export function New(value) {
  if (value === null) {
    return nullValue;
  }

  if (value === undefined) {
    return undefinedValue;
  }

  if (typeof value === 'string') {
    if (stringMap.has(value)) {
      return stringMap.get(value);
    }
    const s = new StringValue(value);
    stringMap.set(value, s);
    return s;
  }

  if (typeof value === 'number') {
    if (numberMap.has(value)) {
      return numberMap.get(value);
    }
    const s = new NumberValue(value);
    numberMap.set(value, s);
    return s;
  }

  if (typeof value === 'boolean') {
    return value ? trueValue : falseValue;
  }

  if (typeof value === 'symbol') {
    return new SymbolValue(value);
  }

  if (typeof value === 'function') {
    return new BuiltinFunctionValue(value);
  }

  throw outOfRange('NewValue', value);
}

export function Type(val) {
  if (val instanceof UndefinedValue) {
    return 'Undefined';
  }

  if (val instanceof NullValue) {
    return 'Null';
  }

  if (val instanceof BooleanValue) {
    return 'Boolean';
  }

  if (val instanceof StringValue) {
    return 'String';
  }

  if (val instanceof NumberValue) {
    return 'Number';
  }

  if (val instanceof SymbolValue) {
    return 'Symbol';
  }

  if (val instanceof ObjectValue) {
    return 'Object';
  }

  if (val instanceof Reference) {
    return 'Reference';
  }

  if (val instanceof Completion) {
    return 'Completion';
  }

  if (val instanceof EnvironmentRecord) {
    return 'EnvironmentRecord';
  }

  if (val instanceof LexicalEnvironment) {
    return 'LexicalEnvironment';
  }

  if (typeof val === 'object'
      && 'Configurable' in val
      && 'Enumerable' in val
      && ('Value' in val || 'Get' in val || 'Set' in val)) {
    return 'Descriptor';
  }

  if (typeof val === 'object' && Object.keys(val).length === 1 && 'Value' in val) {
    return 'Descriptor';
  }

  throw outOfRange('Type', val);
}
