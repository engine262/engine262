import {
  surroundingAgent,
  ExecutionContext,
  isArrayIndex,
} from './engine.mjs';
import {
  ArraySetLength,
  Assert,
  Call,
  Construct,
  CreateArrayFromList,
  GetMethod,
  IsAccessorDescriptor,
  IsConstructor,
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
  ToBoolean,
  ToUint32,
  IsCompatiblePropertyDescriptor,
  ToString,
  IsInteger,
  CanonicalNumericIndexString,
  ToPropertyDescriptor,
  CompletePropertyDescriptor,
  FromPropertyDescriptor,
  IsDataDescriptor,
} from './abstract-ops/all.mjs';
import { EnvironmentRecord, LexicalEnvironment } from './environment.mjs';
import { Q, X } from './completion.mjs';
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
  constructor(realm, Prototype) {
    super();

    this.Prototype = Prototype
      || realm.Intrinsics['%ObjectPrototype%']
      || nullValue;

    this.Extensible = true;
    this.IsClassPrototype = false;
    this.properties = new Map();

    Object.defineProperty(this, 'realm', {
      value: realm,
      enumerable: false,
    });
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

export class ArrayValue extends ObjectValue {
  DefineOwnProperty(P, Desc) {
    const A = this;

    Assert(IsPropertyKey(P));
    if (Type(P) === 'String' && P.stringValue() === 'length') {
      return ArraySetLength(A, Desc);
    }
    if (isArrayIndex(P)) {
      const oldLenDesc = OrdinaryGetOwnProperty(A, New('length'));
      Assert(Type(oldLenDesc) !== 'Undefined' && !IsAccessorDescriptor(oldLenDesc));
      const oldLen = oldLenDesc.Value;
      const index = ToUint32(P);
      if (index.numberValue() >= oldLen.numberValue() && oldLenDesc.Writable === false) {
        return false;
      }
      const succeeded = OrdinaryDefineOwnProperty(A, P, Desc);
      if (succeeded === false) {
        return false;
      }
      if (index.numberValue() >= oldLen.numberValue()) {
        oldLenDesc.Value = New(index.numberValue() + 1);
        const succeeded = OrdinaryDefineOwnProperty(A, New('length'), oldLenDesc); // eslint-disable-line no-shadow
        Assert(succeeded.isTrue());
      }
      return true;
    }
    return OrdinaryDefineOwnProperty(A, P, Desc);
  }
}

export class FunctionValue extends ObjectValue {}

function nc(F, realm, args, thisArgument, newTarget) {
  if (F.properties.has(New('length'))) {
    args.length = F.properties.get(New('length')).Value.numberValue();
  }
  return F.nativeFunction(realm, new Proxy(args, {
    get: (t, p, r) => Reflect.get(t, p, r) || undefinedValue,
  }), {
    thisValue: thisArgument || undefinedValue,
    NewTarget: newTarget || undefinedValue,
  });
}

export class BuiltinFunctionValue extends FunctionValue {
  constructor(realm, nativeFunction) {
    // Unless otherwise specified every built-in function object has the
    // %FunctionPrototype% object as the initial value of its [[Prototype]]
    // internal slot.
    super(realm, realm.Intrinsics['%FunctionPrototype%']);
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
    const result = nc(this, calleeRealm, argumentsList, thisArgument, undefined);
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
    const result = nc(this, calleeRealm, argumentsList, undefined, newTarget);
    surroundingAgent.executionContextStack.pop();
    return result;
  }
}

export class ProxyValue extends ObjectValue {
  constructor(
    ProxyTarget,
    ProxyHandler,
  ) {
    super();

    this.ProxyTarget = ProxyTarget;
    this.ProxyHandler = ProxyHandler;

    if (Type(ProxyTarget) === 'Function') {
      this.Call = (thisArgument, argumentsList) => {
        const O = this;

        const handler = O.ProxyHandler;
        if (Type(handler) === 'Null') {
          return surroundingAgent.Throw('TypeError');
        }
        Assert(Type(handler) === 'Object');
        const target = O.ProxyTarget;
        const trap = GetMethod(handler, New('apply'));
        if (Type(trap) === 'Undefined') {
          return Call(target, thisArgument, argumentsList);
        }
        const argArray = CreateArrayFromList(argumentsList);
        return Call(trap, handler, [target, thisArgument, argArray]);
      };
    }

    if ('Construct' in ProxyTarget) {
      this.Construct = (argumentsList, newTarget) => {
        const O = this;

        const handler = O.ProxyHandler;
        if (Type(handler) === 'Null') {
          return surroundingAgent.Throw('TypeError');
        }
        Assert(Type(handler) === 'Object');
        const target = O.ProxyTarget;
        const trap = GetMethod(handler, New('construct'));
        if (Type(trap) === 'Undefined') {
          Assert(IsConstructor(target).isTrue());
          return Construct(target, argumentsList, newTarget);
        }
        const argArray = CreateArrayFromList(argumentsList);
        const newObj = Call(trap, handler, [target, argArray, newTarget]);
        if (Type(newObj) !== 'Object') {
          return surroundingAgent.Throw('TypeError');
        }
        return newObj;
      };
    }
  }

  GetPrototypeOf() {
    const O = this;
    const handler = O.ProxyHandler;
    if (Type(handler) === 'Null') {
      return surroundingAgent.Throw('TypeError');
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
      return surroundingAgent.Throw('TypeError');
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
      return surroundingAgent.Throw('TypeError');
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
      return surroundingAgent.Throw('TypeError');
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
      return surroundingAgent.Throw('TypeError');
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
      return surroundingAgent.Throw('TypeError');
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
      return surroundingAgent.Throw('TypeError');
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
      return surroundingAgent.Throw('TypeError');
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
      return surroundingAgent.Throw('TypeError');
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
      return surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, New('deleteProperty'));
    if (Type(trap) === 'Undefined') {
      return target.Delete(P);
    }
    const booleanTrapResult = ToBoolean(Call(trap, handler, [target, P]));
    if (booleanTrapResult.isFalse()) {
      return falseValue;
    }
    const targetDesc = target.GetOwnProperty(P);
    if (Type(targetDesc) === 'Undefined') {
      return trueValue;
    }
    if (targetDesc.Configurable === false) {
      return surroundingAgent.Throw('TypeError');
    }
    return trueValue;
  }

  OwnPropertyKeys() {}
}

function StringGetOwnProperty(S, P) {
  Assert(Type(S) === 'Object' && 'StringData' in S);
  Assert(IsPropertyKey(P));
  if (Type(P) !== 'String') {
    return undefinedValue;
  }
  const index = X(CanonicalNumericIndexString(P));
  if (Type(index) === 'Undefined') {
    return undefinedValue;
  }
  if (IsInteger(index).isFalse()) {
    return undefinedValue;
  }
  if (Object.is(index.numberValue(), -0)) {
    return undefinedValue;
  }
  const str = S.StringData;
  const len = str.stringValue().length;
  if (index.numberValue() < 0 || len <= index.numberValue()) {
    return undefinedValue;
  }
  const resultStr = str.stringValue()[index.numberValue()];
  return {
    Value: New(resultStr),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  };
}

export class StringExoticValue extends ObjectValue {
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
    // more
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
      return surroundingAgent.Throw('ReferenceError');
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

export class SuperReference extends Reference {}

const undefinedValue = new UndefinedValue();
const nullValue = new NullValue();
const trueValue = new BooleanValue(true);
const falseValue = new BooleanValue(false);

// TODO(devsnek): clean this up somehow
const stringMap = new Map();
const numberMap = new Map();

export function New(value, realm) {
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
    return new BuiltinFunctionValue(realm, value);
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

  throw outOfRange('Type', val);
}
