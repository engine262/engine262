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
} from './abstract-ops/all.mjs';
import { EnvironmentRecord, LexicalEnvironment } from './environment.mjs';
import { X } from './completion.mjs';

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

class InternalPropertyMap extends Map {
  get(name) {
    if (Type(name) === 'String') {
      name = name.stringValue();
    }
    return super.get(name);
  }

  set(name, value) {
    if (Type(name) === 'String') {
      name = name.stringValue();
    }

    return super.set(name, value);
  }

  has(name) {
    if (Type(name) === 'String') {
      name = name.stringValue();
    }

    return super.has(name);
  }

  delete(name) {
    if (Type(name) === 'String') {
      name = name.stringValue();
    }

    return super.delete(name);
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
    this.properties = new InternalPropertyMap();

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
        const succeeded = OrdinaryDefineOwnProperty(A, New('length'), oldLenDesc);
        Assert(succeeded === true);
      }
      return true;
    }
    return OrdinaryDefineOwnProperty(A, P, Desc);
  }
}

export class FunctionValue extends ObjectValue {
  Call(thisArgument, argumentsList) {
    throw new TypeError('This function object does not have [[Call]] implemented');
  }
}

function nc(F, realm, args, thisArgument, newTarget) {
  if (F.properties.has(New('length'))) {
    args.length = F.properties.get(New('length')).numberValue();
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

    const callerContext = surroundingAgent.runningExecutionContext;
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

    const callerContext = surroundingAgent.runningExecutionContext;
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
    const trap = GetMethod(handler, New('getPrototypeOf'));
    if (Type(trap) === 'Undefined') {
      return target.GetPrototypeOf();
    }
    const handlerProto = Call(trap, handler, [target]);
    if (Type(handlerProto) !== 'Object' && Type(handlerProto) !== 'Null') {
      return surroundingAgent.Throw('TypeError');
    }
    const extensibleTarget = IsExtensible(target);
    if (extensibleTarget === true) {
      return handlerProto;
    }
    const targetProto = target.GetPrototypeOf();
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
    const trap = GetMethod(handler, New('setPrototypeOf'));
    if (Type(trap) === 'Undefined') {
      return target.SetPrototypeOf(V);
    }
    const booleanTrapResult = ToBoolean(Call(trap, handler, [target, V]));
    if (booleanTrapResult.isFalse()) {
      return false;
    }
    const extensibleTarget = IsExtensible(target);
    if (extensibleTarget === true) {
      return true;
    }
    const targetProto = target.GetPrototypeOf();
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
    const trap = GetMethod(handler, New('isExtensible'));
    if (Type(trap) === 'Undefined') {
      return target.IsExtensible();
    }
    const booleanTrapResult = ToBoolean(Call(trap, handler, [target]));
    const targetResult = target.IsExtensible();
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
    const trap = GetMethod(handler, New('preventExtensions'));
    if (Type(trap) === 'Undefined') {
      return target.PreventExtensions();
    }
    const booleanTrapResult = ToBoolean(Call(trap, handler, [target]));
    if (booleanTrapResult.isTrue()) {
      const targetIsExtensible = target.IsExtensible();
      if (targetIsExtensible === true) {
        return surroundingAgent.Throw('TypeError');
      }
    }
    return booleanTrapResult;
  }

  GetOwnProperty(P) {}

  DefineOwnProperty(P, Desc) {}

  HasProperty(P) {}

  Get(P, Receiver) {}

  Set(P, V, Receiver) {}

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

export function New(value, realm) {
  if (value === null) {
    return nullValue;
  }

  if (value === undefined) {
    return undefinedValue;
  }

  if (typeof value === 'string') {
    return new StringValue(value);
  }

  if (typeof value === 'number') {
    return new NumberValue(value);
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

  throw new RangeError('NewValue type out of range');
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

  if ('Configurable' in val && 'Enumerable' in val
      && ('Value' in val || 'Get' in val || 'Set' in val)) {
    return 'Descriptor';
  }

  throw new RangeError('Type(val) invalid argument');
}
