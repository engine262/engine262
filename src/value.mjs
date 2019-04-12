import { ExecutionContext, HostResolveImportedModule, surroundingAgent } from './engine.mjs';
import {
  ArraySetLength,
  Assert,
  Call,
  CanonicalNumericIndexString,
  CompletePropertyDescriptor,
  CreateListFromArrayLike,
  FromPropertyDescriptor,
  Get,
  Set,
  GetMethod,
  HasOwnProperty,
  IntegerIndexedElementGet,
  IntegerIndexedElementSet,
  IsAccessorDescriptor,
  IsCompatiblePropertyDescriptor,
  IsDataDescriptor,
  IsDetachedBuffer,
  IsExtensible,
  IsInteger,
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
  ToInteger,
  ToString,
  InnerModuleInstantiation,
  InnerModuleEvaluation,
  isArrayIndex,
  isIntegerIndex,
} from './abstract-ops/all.mjs';
import { EnvironmentRecord, LexicalEnvironment } from './environment.mjs';
import {
  Completion,
  AbruptCompletion,
  Q,
  X,
} from './completion.mjs';
import { OutOfRange, msg } from './helpers.mjs';

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
    // Redundant value === 0 added to work around a bug in some older versions
    // of V8.
    // Refs: https://github.com/nodejs/node/issues/25268
    // Refs: https://crbug.com/903043
    if (value === 0 && Object.is(value, -0)) {
      return negativeZero;
    }
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

  throw new OutOfRange('new Value', value);
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

const negativeZero = new NumberValue(-0);

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
  'matchAll',
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
ObjectValue.prototype.isOrdinary = true;

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
ArrayExoticObjectValue.prototype.isOrdinary = false;

export class FunctionValue extends ObjectValue {
  static [Symbol.hasInstance](V) {
    return V instanceof ObjectValue && typeof V.Call === 'function';
  }
}

function nativeCall(F, argumentsList, thisArgument, newTarget) {
  return F.nativeFunction(argumentsList, {
    thisValue: thisArgument || Value.undefined,
    NewTarget: newTarget || Value.undefined,
  });
}

export class BuiltinFunctionValue extends FunctionValue {
  constructor(nativeFunction, isConstructor = Value.false) {
    super();
    this.nativeFunction = nativeFunction;
    this.Realm = undefined;
    this.ScriptOrModule = undefined;

    if (isConstructor === Value.true) {
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
        surroundingAgent.executionContextStack.pop(calleeContext);
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
    const result = nativeCall(F, argumentsList, thisArgument, Value.undefined);
    // Remove calleeContext from the execution context stack and
    // restore callerContext as the running execution context.
    surroundingAgent.executionContextStack.pop(calleeContext);
    return result;
  }
}
BuiltinFunctionValue.prototype.isOrdinary = false;

// 9.4.3 #sec-string-exotic-objects
export class StringExoticObjectValue extends ObjectValue {
  constructor() {
    super();

    this.StringData = undefined;
  }

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
    const str = O.StringData;
    Assert(Type(str) === 'String');
    const len = str.stringValue().length;

    for (let i = 0; i < len; i += 1) {
      keys.push(new Value(`${i}`));
    }

    // For each own property key P of O such that P is an array index and
    // ToInteger(P) ≥ len, in ascending numeric index order, do
    //   Add P as the last element of keys.
    for (const P of O.properties.keys()) {
      // This is written with two nested ifs to work around https://github.com/devsnek/engine262/issues/24
      if (isArrayIndex(P)) {
        if (X(ToInteger(P)).numberValue() >= len) {
          keys.push(P);
        }
      }
    }

    // For each own property key P of O such that Type(P) is String and
    // P is not an array index, in ascending chronological order of property creation, do
    //   Add P as the last element of keys.
    for (const P of O.properties.keys()) {
      if (Type(P) === 'String' && isArrayIndex(P) === false) {
        keys.push(P);
      }
    }

    // For each own property key P of O such that Type(P) is Symbol,
    // in ascending chronological order of property creation, do
    //   Add P as the last element of keys.
    for (const P of O.properties.keys()) {
      if (Type(P) === 'Symbol') {
        keys.push(P);
      }
    }

    return keys;
  }
}
StringExoticObjectValue.prototype.isOrdinary = false;

// 9.4.4 #sec-arguments-exotic-objects
export class ArgumentsExoticObjectValue extends ObjectValue {
  constructor() {
    super();

    this.ParameterMap = undefined;
  }

  GetOwnProperty(P) {
    const args = this;
    const desc = OrdinaryGetOwnProperty(args, P);
    if (desc === Value.undefined) {
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
    const isMapped = X(HasOwnProperty(map, P));
    let newArgDesc = Desc;
    if (isMapped === Value.true && IsDataDescriptor(Desc) === true) {
      if (Desc.Value === undefined && Desc.Writable !== undefined && Desc.Writable === Value.false) {
        newArgDesc = Descriptor({ ...Desc });
        newArgDesc.Value = X(Get(map, P));
      }
    }
    const allowed = Q(OrdinaryDefineOwnProperty(args, P, newArgDesc));
    if (allowed === Value.false) {
      return Value.false;
    }
    if (isMapped === Value.true) {
      if (IsAccessorDescriptor(Desc) === true) {
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
    const result = Q(OrdinaryDelete(args, P));
    if (result === Value.true && isMapped === Value.true) {
      map.Delete(P);
    }
    return result;
  }
}
ArgumentsExoticObjectValue.prototype.isOrdinary = false;

// 9.4.5 #sec-integer-indexed-exotic-objects
export class IntegerIndexedExoticObjectValue extends ObjectValue {
  constructor() {
    super();
    this.ViewedArrayBuffer = Value.undefined;
    this.ArrayLength = Value.undefined;
    this.ByteOffset = Value.undefined;
    this.TypedArrayName = Value.undefined;
  }

  // 9.4.5.1 #sec-integer-indexed-exotic-objects-getownproperty-p
  GetOwnProperty(P) {
    const O = this;
    Assert(IsPropertyKey(P));
    Assert(O instanceof ObjectValue && 'ViewedArrayBuffer' in O);
    if (Type(P) === 'String') {
      const numericIndex = X(CanonicalNumericIndexString(P));
      if (numericIndex !== Value.undefined) {
        const value = Q(IntegerIndexedElementGet(O, numericIndex));
        if (value === Value.undefined) {
          return Value.undefined;
        }
        return Descriptor({
          Value: value,
          Writable: Value.true,
          Enumerable: Value.true,
          Configurable: Value.false,
        });
      }
    }
    return OrdinaryGetOwnProperty(O, P);
  }

  // 9.4.5.2 #sec-integer-indexed-exotic-objects-hasproperty-p
  HasProperty(P) {
    const O = this;
    Assert(IsPropertyKey(P));
    Assert(O instanceof ObjectValue && 'ViewedArrayBuffer' in O);
    if (Type(P) === 'String') {
      let numericIndex = X(CanonicalNumericIndexString(P));
      if (numericIndex !== Value.undefined) {
        const buffer = O.ViewedArrayBuffer;
        if (IsDetachedBuffer(buffer)) {
          return surroundingAgent.Throw('TypeError', 'Attempt to access detached ArrayBuffer');
        }
        if (IsInteger(numericIndex) === Value.false) {
          return Value.false;
        }
        numericIndex = numericIndex.numberValue();
        if (Object.is(numericIndex, -0)) {
          return Value.false;
        }
        if (numericIndex < 0) {
          return Value.false;
        }
        if (numericIndex >= O.ArrayLength.numberValue()) {
          return Value.false;
        }
        return Value.true;
      }
    }
    return Q(OrdinaryHasProperty(O, P));
  }

  // 9.4.5.3 #sec-integer-indexed-exotic-objects-defineownproperty-p-desc
  DefineOwnProperty(P, Desc) {
    const O = this;
    Assert(IsPropertyKey(P));
    Assert(O instanceof ObjectValue && 'ViewedArrayBuffer' in O);
    if (Type(P) === 'String') {
      const numericIndex = X(CanonicalNumericIndexString(P));
      if (numericIndex !== Value.undefined) {
        if (IsInteger(numericIndex) === Value.false) {
          return Value.false;
        }
        if (Object.is(numericIndex.numberValue(), -0)) {
          return Value.false;
        }
        if (numericIndex.numberValue() < 0) {
          return Value.false;
        }
        const length = O.ArrayLength;
        if (numericIndex.numberValue() >= length.numberValue()) {
          return Value.false;
        }
        if (IsAccessorDescriptor(Desc)) {
          return Value.false;
        }
        if (Desc.Configurable === Value.true) {
          return Value.false;
        }
        if (Desc.Enumerable === Value.false) {
          return Value.false;
        }
        if (Desc.Writable === Value.false) {
          return Value.false;
        }
        if (Desc.Value !== undefined) {
          const value = Desc.Value;
          return Q(IntegerIndexedElementSet(O, numericIndex, value));
        }
        return Value.true;
      }
    }
    return Q(OrdinaryDefineOwnProperty(O, P, Desc));
  }

  // 9.4.5.4 #sec-integer-indexed-exotic-objects-get-p-receiver
  Get(P, Receiver) {
    const O = this;
    Assert(IsPropertyKey(P));
    if (Type(P) === 'String') {
      const numericIndex = X(CanonicalNumericIndexString(P));
      if (numericIndex !== Value.undefined) {
        return Q(IntegerIndexedElementGet(O, numericIndex));
      }
    }
    return Q(OrdinaryGet(O, P, Receiver));
  }

  // 9.4.5.5 #sec-integer-indexed-exotic-objects-set-p-v-receiver
  Set(P, V, Receiver) {
    const O = this;
    Assert(IsPropertyKey(P));
    if (Type(P) === 'String') {
      const numericIndex = X(CanonicalNumericIndexString(P));
      if (numericIndex !== Value.undefined) {
        return Q(IntegerIndexedElementSet(O, numericIndex, V));
      }
    }
    return Q(OrdinarySet(O, P, V, Receiver));
  }

  // 9.4.5.6 #sec-integer-indexed-exotic-objects-ownpropertykeys
  OwnPropertyKeys() {
    const O = this;
    const keys = [];
    Assert(O instanceof ObjectValue
        && 'ViewedArrayBuffer' in O
        && 'ArrayLength' in O
        && 'ByteOffset' in O
        && 'TypedArrayName' in O);
    const len = O.ArrayLength.numberValue();
    for (let i = 0; i < len; i += 1) {
      keys.push(X(ToString(new Value(i))));
    }
    for (const P of O.properties.keys()) {
      if (Type(P) === 'String') {
        if (!isIntegerIndex(P)) {
          keys.push(P);
        }
      }
    }
    for (const P of O.properties.keys()) {
      if (Type(P) === 'Symbol') {
        keys.push(P);
      }
    }
    return keys;
  }
}
IntegerIndexedExoticObjectValue.prototype.isOrdinary = false;

// 9.4.7.2 #sec-set-immutable-prototype
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
    return Descriptor({
      Value: value,
      Writable: Value.true,
      Enumerable: Value.true,
      Configurable: Value.false,
    });
  }

  DefineOwnProperty(P, Desc) {
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

  HasProperty(P) {
    const O = this;

    if (Type(P) === 'Symbol') {
      return OrdinaryHasProperty(O, P);
    }
    const exports = O.Exports;
    if (exports.includes(P)) {
      return Value.true;
    }
    return Value.false;
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
    const binding = m.ResolveExport(P);
    Assert(binding instanceof ResolvedBindingRecord);
    const targetModule = binding.Module;
    Assert(targetModule !== Value.undefined);
    const targetEnv = targetModule.Environment;
    if (targetEnv === Value.undefined) {
      return surroundingAgent.Throw('ReferenceError', msg('NotDefined', P));
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
      return Q(OrdinaryDelete(O, P));
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
ModuleNamespaceExoticObjectValue.prototype.isOrdinary = false;

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
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'getPrototypeOf'));
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('getPrototypeOf')));
    if (trap === Value.undefined) {
      return Q(target.GetPrototypeOf());
    }
    const handlerProto = Q(Call(trap, handler, [target]));
    if (Type(handlerProto) !== 'Object' && Type(handlerProto) !== 'Null') {
      return surroundingAgent.Throw('TypeError', '\'getPrototypeOf\' on proxy: trap returned neither object nor null');
    }
    const extensibleTarget = Q(IsExtensible(target));
    if (extensibleTarget === Value.true) {
      return handlerProto;
    }
    const targetProto = Q(target.GetPrototypeOf());
    if (SameValue(handlerProto, targetProto) === Value.false) {
      return surroundingAgent.Throw('TypeError', '\'getPrototypeOf\' on proxy: proxy target is non-extensible but the trap did not return its actual prototype');
    }
    return handlerProto;
  }

  SetPrototypeOf(V) {
    const O = this;

    Assert(Type(V) === 'Object' || Type(V) === 'Null');
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'setPrototypeOf'));
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
    if (SameValue(V, targetProto) === Value.false) {
      return surroundingAgent.Throw('TypeError', '\'setPrototypeOf\' on proxy: trap returned truthy for setting a new prototype on the non-extensible proxy target');
    }
    return Value.true;
  }

  IsExtensible() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'isExtensible'));
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
      return surroundingAgent.Throw('TypeError', '\'isExtensible\' on proxy: trap result does not reflect extensibility of proxy target');
    }
    return booleanTrapResult;
  }

  PreventExtensions() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'preventExtensions'));
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
        return surroundingAgent.Throw('TypeError', '\'preventExtensions\' on proxy: trap returned truthy but the proxy target is extensible');
      }
    }
    return booleanTrapResult;
  }

  GetOwnProperty(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'getOwnPropertyDescriptor'));
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('getOwnPropertyDescriptor')));
    if (trap === Value.undefined) {
      return Q(target.GetOwnProperty(P));
    }
    const trapResultObj = Q(Call(trap, handler, [target, P]));
    if (Type(trapResultObj) !== 'Object' && Type(trapResultObj) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError', '\'getOwnPropertyDescriptor\' on proxy: trap returned neither object nor undefined for property');
    }
    const targetDesc = Q(target.GetOwnProperty(P));
    if (trapResultObj === Value.undefined) {
      if (targetDesc === Value.undefined) {
        return Value.undefined;
      }
      if (targetDesc.Configurable === Value.false) {
        return surroundingAgent.Throw('TypeError', '\'getOwnPropertyDescriptor\' on proxy: trap returned undefined for property which is non-configurable in the proxy target');
      }
      const extensibleTarget = Q(IsExtensible(target));
      if (extensibleTarget === Value.false) {
        return surroundingAgent.Throw('TypeError', '\'getOwnPropertyDescriptor\' on proxy: trap returned undefined for property which exists in the non-extensible proxy target');
      }
      return Value.undefined;
    }
    const extensibleTarget = Q(IsExtensible(target));
    const resultDesc = Q(ToPropertyDescriptor(trapResultObj));
    CompletePropertyDescriptor(resultDesc);
    const valid = IsCompatiblePropertyDescriptor(extensibleTarget, resultDesc, targetDesc);
    if (valid === Value.false) {
      return surroundingAgent.Throw('TypeError', '\'getOwnPropertyDescriptor\' on proxy: trap returned descriptor for property that is incompatible with the existing property in the proxy target');
    }
    if (resultDesc.Configurable === Value.false) {
      if (targetDesc === Value.undefined || targetDesc.Configurable === Value.true) {
        return surroundingAgent.Throw('TypeError', '\'getOwnPropertyDescriptor\' on proxy: trap reported non-configurability for property which is either non-existant or configurable in the proxy target');
      }
    }
    return resultDesc;
  }

  DefineOwnProperty(P, Desc) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'defineProperty'));
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
        return surroundingAgent.Throw('TypeError', '\'defineProperty\' on proxy: trap returned truthy for defining non-configurable property which is either non-existant or configurable in the proxy target');
      }
      if (settingConfigFalse === true) {
        return surroundingAgent.Throw('TypeError', '\'defineProperty\' on proxy: trap returned truthy for adding property to the non-extensible proxy target');
      }
    } else {
      if (IsCompatiblePropertyDescriptor(extensibleTarget, Desc, targetDesc) === Value.false) {
        return surroundingAgent.Throw('TypeError', '\'defineProperty\' on proxy: trap returned truthy for adding property that is incompatible with the existing property in the proxy target');
      }
      if (settingConfigFalse === true && targetDesc.Configurable === Value.true) {
        return surroundingAgent.Throw('TypeError', '\'defineProperty\' on proxy: trap returned truthy for defining non-configurable property which is either non-existant or configurable in the proxy target');
      }
    }
    return Value.true;
  }

  HasProperty(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'has'));
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
          return surroundingAgent.Throw('TypeError', '\'has\' on proxy: trap returned falsy for property which exists in the proxy target as non-configurable');
        }
        const extensibleTarget = Q(IsExtensible(target));
        if (extensibleTarget === Value.false) {
          return surroundingAgent.Throw('TypeError', '\'has\' on proxy: trap returned falsy for property but the proxy target is not extensible');
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
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'get'));
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
      if (IsDataDescriptor(targetDesc) === true && targetDesc.Writable === Value.false) {
        if (SameValue(trapResult, targetDesc.Value) === Value.false) {
          return surroundingAgent.Throw('TypeError', '\'get\' on proxy: property is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value');
        }
      }
      if (IsAccessorDescriptor(targetDesc) === true && targetDesc.Get === Value.undefined) {
        if (trapResult !== Value.undefined) {
          return surroundingAgent.Throw('TypeError', '\'get\' on proxy: property is a non-configurable accessor property on the proxy target and does not have a getter function, but the trap did not return undefined');
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
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'set'));
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
      if (IsDataDescriptor(targetDesc) === true && targetDesc.Writable === Value.false) {
        if (SameValue(V, targetDesc.Value) === Value.false) {
          return surroundingAgent.Throw('TypeError', '\'set\' on proxy: trap returned truthy for property which exists in the proxy target as a non-configurable and non-writable data property with a different value');
        }
      }
      if (IsAccessorDescriptor(targetDesc) === true) {
        if (targetDesc.Set === Value.undefined) {
          return surroundingAgent.Throw('TypeError', '\'set\' on proxy: trap returned truish for property which exists in the proxy target as a non-configurable and non-writable accessor property without a setter');
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
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'deleteProperty'));
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
      return surroundingAgent.Throw('TypeError', '\'deleteProperty\' on proxy: trap returned truthy for property which is non-configurable in the proxy target');
    }
    return Value.true;
  }

  OwnPropertyKeys() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'ownKeys'));
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
      return surroundingAgent.Throw('TypeError', '\'ownKeys\' on proxy: trap returned duplicate keys');
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
    const uncheckedResultKeys = new global.Set(trapResult);
    for (const key of targetNonconfigurableKeys) {
      if (!uncheckedResultKeys.has(key)) {
        return surroundingAgent.Throw('TypeError', '\'ownKeys\' on proxy: trap result does not include non-configurable key');
      }
      uncheckedResultKeys.delete(key);
    }
    if (extensibleTarget === Value.true) {
      return trapResult;
    }
    for (const key of targetConfigurableKeys) {
      if (!uncheckedResultKeys.has(key)) {
        return surroundingAgent.Throw('TypeError', '\'ownKeys\' on proxy: trap result does not include configurable key');
      }
      uncheckedResultKeys.delete(key);
    }
    if (uncheckedResultKeys.size > 0) {
      return surroundingAgent.Throw('TypeError', '\'ownKeys\' on proxy: trap returned extra keys but proxy target is non-extensible');
    }
    return trapResult;
  }
}
ProxyExoticObjectValue.prototype.isOrdinary = false;

export class Reference {
  constructor({ BaseValue, ReferencedName, StrictReference }) {
    this.BaseValue = BaseValue;
    this.ReferencedName = ReferencedName;
    Assert(Type(StrictReference) === 'Boolean');
    this.StrictReference = StrictReference;
  }
}

export class SuperReference extends Reference {
  constructor({
    BaseValue,
    ReferencedName,
    thisValue,
    StrictReference,
  }) {
    super({ BaseValue, ReferencedName, StrictReference });
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
  constructor(sizeOrBuffer, ...restArgs) {
    if (sizeOrBuffer instanceof ArrayBuffer) {
      // fine.
      super(sizeOrBuffer, ...restArgs);
    } else {
      Assert(typeof sizeOrBuffer === 'number');
      super(sizeOrBuffer);
    }
  }
}

// #importentry-record
export class ImportEntryRecord {
  constructor(O) {
    Assert(Type(O.ModuleRequest) === 'String');
    Assert(Type(O.ImportName) === 'String');
    Assert(Type(O.LocalName) === 'String');
    this.ModuleRequest = O.ModuleRequest;
    this.ImportName = O.ImportName;
    this.LocalName = O.LocalName;
  }
}

// #exportentry-record
export class ExportEntryRecord {
  constructor(O) {
    Assert(Type(O.ExportName) === 'String' || Type(O.ExportName) === 'Null');
    Assert(Type(O.ModuleRequest) === 'String' || Type(O.ModuleRequest) === 'Null');
    Assert(Type(O.ImportName) === 'String' || Type(O.ImportName) === 'Null');
    Assert(Type(O.LocalName) === 'String' || Type(O.LocalName) === 'Null');
    this.ExportName = O.ExportName;
    this.ModuleRequest = O.ModuleRequest;
    this.ImportName = O.ImportName;
    this.LocalName = O.LocalName;
  }
}

export class ResolvedBindingRecord {
  constructor({ Module, BindingName }) {
    this.Module = Module;
    this.BindingName = BindingName;
  }
}

export class ModuleRecord {
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
}

export class SourceTextModuleRecord extends ModuleRecord {
  constructor(init) {
    super(init);

    ({
      ECMAScriptCode: this.ECMAScriptCode,
      RequestedModules: this.RequestedModules,
      ImportEntries: this.ImportEntries,
      LocalExportEntries: this.LocalExportEntries,
      IndirectExportEntries: this.IndirectExportEntries,
      StarExportEntries: this.StarExportEntries,
      Status: this.Status,
      EvaluationError: this.EvaluationError,
      DFSIndex: this.DFSIndex,
      DFSAncestorIndex: this.DFSAncestorIndex,
    } = init);
  }

  // 15.2.1.16.2 #sec-getexportednames
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

  // 15.2.1.16.3 #sec-resolveexport
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

  // 15.2.1.16.4 #sec-moduledeclarationinstantiation
  Instantiate() {
    const module = this;
    Assert(module.Status !== 'instantiating' && module.Status !== 'evaluating');
    const stack = [];
    const result = InnerModuleInstantiation(module, stack, 0);
    if (result instanceof AbruptCompletion) {
      for (const m of stack) {
        Assert(m.Status === 'instantiating');
        m.Status = 'uninstantiated';
        m.Environment = Value.undefined;
        m.DFSIndex = Value.undefined;
        m.DFSAncestorIndex = Value.undefined;
      }
      Assert(module.Status === 'uninstantiated');
      return result;
    }
    Assert(module.Status === 'instantiated' || module.Status === 'evaluated');
    Assert(stack.length === 0);
    return Value.undefined;
  }

  // 15.2.1.16.5 #sec-moduleevaluation
  Evaluate() {
    const module = this;
    Assert(module.Status === 'instantiated' || module.Status === 'evaluated');
    const stack = [];
    const result = InnerModuleEvaluation(module, stack, 0);
    if (result instanceof AbruptCompletion) {
      for (const m of stack) {
        Assert(m.Status === 'evaluating');
        m.Status = 'evaluated';
        m.EvaluationError = result;
      }
      Assert(module.Status === 'evaluated' && module.EvaluationError === result);
      return result;
    }
    Assert(module.Status === 'evaluated' && module.EvaluationError === Value.undefined);
    Assert(stack.length === 0);
    return Value.undefined;
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

  throw new OutOfRange('Type', val);
}
