import { ExecutionContext, surroundingAgent } from './engine.mjs';
import {
  ArraySetLength,
  Assert,
  Call,
  CompletePropertyDescriptor,
  CreateListFromArrayLike,
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
  ToUint32,
  isArrayIndex,
} from './abstract-ops/all.mjs';
import { EnvironmentRecord, LexicalEnvironment } from './environment.mjs';
import { Completion, Q, X } from './completion.mjs';
import { outOfRange } from './helpers.mjs';

export function Value(value) {
  if (new.target !== undefined && new.target !== Value) {
    return undefined;
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

  if (typeof value === 'function') {
    return new BuiltinFunctionValue(value);
  }

  throw outOfRange('new Value', value);
}

export class PrimitiveValue extends Value {}

export class UndefinedValue extends PrimitiveValue {}

export class NullValue extends PrimitiveValue {}

export class BooleanValue extends PrimitiveValue {
  constructor(v) {
    super();
    this.value = v;
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `Boolean { ${this.value} }`;
  }
}

Object.defineProperties(Value, {
  undefined: { value: new UndefinedValue(), configurable: false, writable: false },
  null: { value: new NullValue(), configurable: false, writable: false },
  true: { value: new BooleanValue(true), configurable: false, writable: false },
  false: { value: new BooleanValue(false), configurable: false, writable: false },
});

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
    } else if (isArrayIndex(P)) {
      const oldLenDesc = OrdinaryGetOwnProperty(A, new Value('length'));
      Assert(Type(oldLenDesc) !== 'Undefined' && !IsAccessorDescriptor(oldLenDesc));
      const oldLen = oldLenDesc.Value;
      const index = X(ToUint32(P));
      if (index.numberValue() >= oldLen.numberValue() && oldLenDesc.Writable === Value.false) {
        return Value.false;
      }
      const succeeded = X(OrdinaryDefineOwnProperty(A, P, Desc));
      if (succeeded === Value.false) {
        return Value.false;
      }
      if (index.numberValue() >= oldLen.numberValue()) {
        oldLenDesc.Value = new Value(index.numberValue() + 1);
        const succeeded = OrdinaryDefineOwnProperty(A, new Value('length'), oldLenDesc); // eslint-disable-line no-shadow
        Assert(succeeded === Value.true);
      }
      return Value.true;
    }
    return OrdinaryDefineOwnProperty(A, P, Desc);
  }
}

export class FunctionValue extends ObjectValue {}

function nativeCall(F, argumentsList, thisArgument, newTarget) {
  const callLength = argumentsList.length;

  // Fill in "required" properties
  const length = new Value('length');
  if (F.properties.has(length)) {
    const len = F.properties.get(length).Value.numberValue();
    for (let i = 0; i < len; i += 1) {
      if (argumentsList[i] === undefined) {
        argumentsList[i] = Value.undefined;
      }
    }
  }

  return F.nativeFunction(argumentsList, {
    thisValue: thisArgument || Value.undefined,
    NewTarget: newTarget || Value.undefined,
    callLength,
  });
}

export class BuiltinFunctionValue extends FunctionValue {
  constructor(nativeFunction) {
    super();
    this.nativeFunction = nativeFunction;
    this.Realm = undefined;
    this.ScriptOrModule = undefined;

    if (this.nativeFunction.toString().includes('NewTarget')) {
      this.Construct = function Construct(argumentsList, newTarget) {
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
      };
    }
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
}

// 9.4.3 #sec-string-exotic-objects
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
      keys.push(new Value(`${i}`));
    }
    for (const key of O.properties.keys()) {
      if (Type(key) === 'String') {
        const int = Number.parseInt(key.stringValue(), 10);
        if (int > 0 && int < (2 ** 53) - 1) {
          // keys.push(key);
        } else {
          keys.push(key);
        }
      } else if (Type(key) === 'Symbol') {
        keys.push(key);
      }
    }
    return keys;
  }
}

// 9.4.4 #sec-arguments-exotic-objects
export class ArgumentsExoticObjectValue extends ObjectValue {
  constructor() {
    super();

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
    if (isMapped === Value.true) {
      desc.Value = Get(map, P);
    }
    return desc;
  }

  DefineOwnProperty(P, Desc) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = HasOwnProperty(map, P);
    let newArgDesc = Desc;
    if (isMapped === Value.true && IsDataDescriptor(Desc) === Value.true) {
      if (Value.Desc === undefined && Desc.Writable !== undefined && Desc.Writable === Value.false) {
        newArgDesc = { ...Desc };
        newArgDesc.Value = Get(map, P);
      }
    }
    const allowed = Q(OrdinaryDefineOwnProperty(args, P, newArgDesc));
    if (allowed === Value.false) {
      return Value.false;
    }
    if (isMapped === Value.true) {
      if (IsAccessorDescriptor(Desc) === Value.true) {
        map.Delete(P);
      } else {
        if (Desc.Value !== undefined) {
          const setStatus = Set(map, P, Desc.Value, Value.false);
          Assert(setStatus === Value.true);
        }
        if (Desc.Writable !== undefined && Desc.Writable === Value.false) {
          map.Delete(P);
        }
      }
    }
    return Value.true;
  }

  Get(P, Receiver) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    if (isMapped === Value.false) {
      return Q(OrdinaryGet(args, P, Receiver));
    } else {
      return Get(map, P);
    }
  }

  Set(P, V, Receiver) {
    const args = this;
    let isMapped;
    let map;
    if (SameValue(args, Receiver) === Value.false) {
      isMapped = false;
    } else {
      map = args.ParameterMap;
      isMapped = X(HasOwnProperty(map, P)) === Value.true;
    }
    if (isMapped) {
      const setStatus = Set(map, P, V, Value.false);
      Assert(setStatus === Value.true);
    }
    return Q(OrdinarySet(args, P, V, Receiver));
  }

  Delete(P) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    const result = Q(OrdinaryDelete(map, P));
    if (result === Value.true && isMapped === Value.true) {
      map.Delete(P);
    }
    return result;
  }
}

// #sec-set-immutable-prototype
function SetImmutablePrototype(O, V) {
  Assert(Type(V) === 'Object' || Type(V) === 'Null');
  const current = Q(O.GetPrototypeOf());
  if (SameValue(V, current) === Value.true) {
    return Value.true;
  }
  return Value.false;
}

// 9.4.6 #sec-module-namespace-exotic-objects
export class ModuleNamespaceExoticObjectValue extends ObjectValue {
  constructor() {
    super();
    this.Module = null;
    this.Exports = [];
    this.Prototype = Value.null;
  }

  SetPrototypeOf(V) {
    const O = this;

    return Q(SetImmutablePrototype(O, V));
  }

  IsExtensible() {
    return Value.false;
  }

  PreventExtensions() {
    return Value.true;
  }

  GetOwnProperty(P) {
    const O = this;

    if (Type(P) === 'Symbol') {
      return OrdinaryGetOwnProperty(O, P);
    }
    const exports = O.Exports;
    if (!exports.includes(P)) {
      return Value.undefined;
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
      return Value.false;
    }
    if (IsAccessorDescriptor(Desc) === Value.true) {
      return Value.false;
    }
    if (Desc.Writable !== undefined && Desc.Writable === Value.false) {
      return Value.false;
    }
    if (Desc.Enumerable !== undefined && Desc.Enumerable === Value.false) {
      return Value.false;
    }
    if (Desc.Configurable !== undefined && Desc.Configurable === Value.true) {
      return Value.true;
    }
    if (Desc.Value !== undefined && SameValue(Desc.Value, current.Value) === Value.true) {
      return Value.false;
    }
    return Value.true;
  }

  HasProperty(P) {
    const O = this;

    if (Type(P) === 'Symbol') {
      return OrdinaryHasProperty(O, P);
    }
    const exports = O.Exports;
    if (exports.includes(P)) {
      return Value.true;
    } else {
      return Value.false;
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
      return Value.undefined;
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
    return Q(targetEnvRec.GetBindingValue(binding.BindingName, Value.true));
  }

  Set() {
    return Value.false;
  }

  Delete(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    if (Type(P) === 'Symbol') {
      return OrdinaryDelete(O, P);
    }
    const exports = O.Exports;
    if (exports.includes(P)) {
      return Value.false;
    }
    return Value.true;
  }

  OwnPropertyKeys() {
    const O = this;

    const exports = [...O.Exports];
    const symbolKeys = X(OrdinaryOwnPropertyKeys(O));
    exports.push(...symbolKeys);
    return exports;
  }
}

// 9.5 #sec-proxy-object-internal-methods-and-internal-slots
export class ProxyExoticObjectValue extends ObjectValue {
  constructor() {
    super();

    this.ProxyTarget = undefined;
    this.ProxyHandler = undefined;
  }

  GetPrototypeOf() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform getPrototypeOf on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('getPrototypeOf')));
    if (trap === Value.undefined) {
      return Q(target.GetPrototypeOf());
    }
    const handlerProto = Q(Call(trap, handler, [target]));
    if (Type(handlerProto) !== 'Object' && Type(handlerProto) !== 'Null') {
      return surroundingAgent.Throw('TypeError');
    }
    const extensibleTarget = Q(IsExtensible(target));
    if (extensibleTarget === Value.true) {
      return handlerProto;
    }
    const targetProto = Q(target.GetPrototypeOf());
    if (SameValue(handlerProto, targetProto) === Value.false) {
      return surroundingAgent.Throw('TypeError');
    }
    return handlerProto;
  }

  SetPrototypeOf(V) {
    const O = this;

    Assert(Type(V) === 'Object' || Type(V) === 'Null');
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform setPrototypeOf on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('setPrototypeOf')));
    if (trap === Value.undefined) {
      return Q(target.SetPrototypeOf(V));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, V])));
    if (booleanTrapResult === Value.false) {
      return Value.false;
    }
    const extensibleTarget = Q(IsExtensible(target));
    if (extensibleTarget === Value.true) {
      return Value.true;
    }
    const targetProto = Q(target.GetPrototypeOf());
    if (SameValue(V, targetProto) === Value.true) {
      return surroundingAgent.Throw('TypeError');
    }
    return Value.true;
  }

  IsExtensible() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform isExtensible on proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('isExtensible')));
    if (trap === Value.undefined) {
      return Q(target.IsExtensible());
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target])));
    const targetResult = Q(target.IsExtensible());
    if (SameValue(booleanTrapResult, targetResult) === Value.false) {
      return surroundingAgent.Throw('TypeError');
    }
    return booleanTrapResult;
  }

  PreventExtensions() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform preventExtensions on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('preventExtensions')));
    if (trap === Value.undefined) {
      return Q(target.PreventExtensions());
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target])));
    if (booleanTrapResult === Value.true) {
      const targetIsExtensible = Q(target.IsExtensible());
      if (targetIsExtensible === Value.true) {
        return surroundingAgent.Throw('TypeError');
      }
    }
    return booleanTrapResult;
  }

  GetOwnProperty(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform getOwnPropertyDescriptor on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('getOwnPropertyDescriptor')));
    if (trap === Value.undefined) {
      return Q(target.GetOwnProperty(P));
    }
    const trapResultObj = Q(Call(trap, handler, [target, P]));
    if (Type(trapResultObj) !== 'Object' || Type(trapResultObj) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError');
    }
    const targetDesc = Q(target.GetOwnProperty(P));
    if (trapResultObj === Value.undefined) {
      if (targetDesc === Value.undefined) {
        return Value.undefined;
      }
      if (targetDesc.Configurable === Value.false) {
        return surroundingAgent.Throw('TypeError');
      }
      const extensibleTarget = Q(IsExtensible(target));
      Assert(Type(extensibleTarget) === 'Boolean');
      if (extensibleTarget === Value.false) {
        return surroundingAgent.Throw('TypeError');
      }
      return Value.undefined;
    }
    const extensibleTarget = Q(IsExtensible(target));
    const resultDesc = Q(ToPropertyDescriptor(trapResultObj));
    CompletePropertyDescriptor(resultDesc);
    const valid = IsCompatiblePropertyDescriptor(extensibleTarget, resultDesc, targetDesc);
    if (valid === Value.false) {
      return surroundingAgent.Throw('TypeError');
    }
    if (resultDesc.Configurable === Value.false) {
      if (targetDesc === Value.undefined || targetDesc.Configurable === Value.false) {
        return surroundingAgent.Throw('TypeError');
      }
    }
    return resultDesc;
  }

  DefineOwnProperty(P, Desc) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform defineProperty on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('defineProperty')));
    if (trap === Value.undefined) {
      return Q(target.DefineOwnProperty(P, Desc));
    }
    const descObj = FromPropertyDescriptor(Desc);
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P, descObj])));
    if (booleanTrapResult === Value.false) {
      return Value.false;
    }
    const targetDesc = Q(target.GetOwnProperty(P));
    const extensibleTarget = Q(IsExtensible(target));
    let settingConfigFalse;
    if (Desc.Configurable !== undefined && Desc.Configurable === Value.false) {
      settingConfigFalse = true;
    } else {
      settingConfigFalse = false;
    }
    if (targetDesc === Value.undefined) {
      if (extensibleTarget === Value.false) {
        return surroundingAgent.Throw('TypeError');
      }
      if (settingConfigFalse === true) {
        return surroundingAgent.Throw('TypeError');
      }
    } else {
      if (IsCompatiblePropertyDescriptor(extensibleTarget, Desc, targetDesc) === Value.false) {
        return surroundingAgent.Throw('TypeError');
      }
      if (settingConfigFalse === true && targetDesc.Configurable === Value.true) {
        return surroundingAgent.Throw('TypeError');
      }
    }
    return Value.true;
  }

  HasProperty(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform has on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('has')));
    if (trap === Value.undefined) {
      return Q(target.HasProperty(P));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P])));
    if (booleanTrapResult === Value.false) {
      const targetDesc = Q(target.GetOwnProperty(P));
      if (targetDesc !== Value.undefined) {
        if (targetDesc.Configurable === Value.false) {
          return surroundingAgent.Throw('TypeError');
        }
        const extensibleTarget = Q(IsExtensible(target));
        if (extensibleTarget === Value.false) {
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
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform get on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('get')));
    if (trap === Value.undefined) {
      return Q(target.Get(P, Receiver));
    }
    const trapResult = Q(Call(trap, handler, [target, P, Receiver]));
    const targetDesc = Q(target.GetOwnProperty(P));
    if (targetDesc !== Value.undefined && targetDesc.Configurable === Value.false) {
      if (IsDataDescriptor(targetDesc) === Value.true && targetDesc.Writable === Value.false) {
        if (SameValue(trapResult, targetDesc.Value) === Value.false) {
          return surroundingAgent.Throw('TypeError');
        }
      }
      if (IsAccessorDescriptor(targetDesc) === Value.true && targetDesc.Get === Value.undefined) {
        if (trapResult !== Value.undefined) {
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
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform set on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('set')));
    if (trap === Value.undefined) {
      return Q(target.Set(P, V, Receiver));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P, V, Receiver])));
    if (booleanTrapResult === Value.false) {
      return Value.false;
    }
    const targetDesc = Q(target.GetOwnProperty(P));
    if (targetDesc !== Value.undefined && targetDesc.Configurable === Value.false) {
      if (IsDataDescriptor(targetDesc) === Value.true && targetDesc.Writable === Value.false) {
        if (SameValue(V, targetDesc.Value) === Value.false) {
          return surroundingAgent.Throw('TypeError');
        }
      }
      if (IsAccessorDescriptor(targetDesc) === Value.true) {
        if (targetDesc.Set === Value.undefined) {
          return surroundingAgent.Throw('TypeError');
        }
      }
    }
    return Value.true;
  }

  Delete(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform deleteProperty on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('deleteProperty')));
    if (trap === Value.undefined) {
      return Q(target.Delete(P));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P])));
    if (booleanTrapResult === Value.false) {
      return Value.false;
    }
    const targetDesc = Q(target.GetOwnProperty(P));
    if (targetDesc === Value.undefined) {
      return Value.true;
    }
    if (targetDesc.Configurable === Value.false) {
      return surroundingAgent.Throw('TypeError');
    }
    return Value.true;
  }

  OwnPropertyKeys() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'cannot perform ownKeys on a proxy that has been revoked');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('ownKeys')));
    if (trap === Value.undefined) {
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
      if (desc !== Value.undefined && desc.Configurable === Value.false) {
        targetNonconfigurableKeys.push(key);
      } else {
        targetConfigurableKeys.push(key);
      }
    }
    if (extensibleTarget === Value.true && targetNonconfigurableKeys.length === 0) {
      return trapResult;
    }
    const uncheckedResultKeys = [...trapResult];
    for (const key of targetNonconfigurableKeys) {
      if (!uncheckedResultKeys.includes(key)) {
        return surroundingAgent.Throw('TypeError', 'ownKeys trap result does not include non-configurable key');
      }
      uncheckedResultKeys.splice(uncheckedResultKeys.indexOf(key), 1);
    }
    if (extensibleTarget === Value.true) {
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

// TODO(devsnek): clean this up somehow
const stringMap = new Map();
const numberMap = new Map();

export function Descriptor(O) {
  if (new.target === Descriptor) {
    this.Value = O.Value;
    this.Get = O.Get;
    this.Set = O.Set;
    this.Writable = O.Writable;
    this.Enumerable = O.Enumerable;
    this.Configurable = O.Configurable;
  } else {
    return new Descriptor(O);
  }
}

Descriptor.prototype.everyFieldIsAbsent = function everyFieldIsAbsent() {
  return this.Value === undefined
    && this.Get === undefined
    && this.Set === undefined
    && this.Writable === undefined
    && this.Enumerable === undefined
    && this.Configurable === undefined;
};

export class DataBlock extends Uint8Array {
  constructor(size) {
    Assert(typeof size === 'number');
    super(size);
  }
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

  if (val instanceof Descriptor) {
    return 'Descriptor';
  }

  if (val instanceof DataBlock) {
    return 'Data Block';
  }

  throw outOfRange('Type', val);
}
