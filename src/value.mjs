import {
  surroundingAgent,
  ExecutionContext,
  Assert,
  Type,

  SameValue,
  IsExtensible,
  IsPropertyKey,
  IsArrayIndex,
  IsConstructor,
  IsAccessorDescriptor,
  GetMethod,

  CreateArrayFromList,
  ArraySetLength,
  Construct,

  ToBoolean,
  ToUint32,

  OrdinaryGetPrototypeOf,
  OrdinarySetPrototypeOf,
  OrdinaryIsExtensible,
  OrdinaryPreventExtensions,
  OrdinaryGetOwnProperty,
  OrdinaryDefineOwnProperty,
  OrdinaryHasProperty,
  OrdinaryGet,
  OrdinarySet,
  OrdinaryDelete,
  OrdinaryOwnPropertyKeys,

  Call,
} from './engine.mjs';

export class Value {
  constructor(realm) {
    this.realm = realm;
  }

  get value() {
    throw new Error();
  }

  isUndefined() {
    return false;
  }

  isNull() {
    return false;
  }
}

export class PrimitiveValue extends Value {}

export class UndefinedValue extends PrimitiveValue {
  isUndefined() {
    return true;
  }
}

export class NullValue extends PrimitiveValue {
  isNull() {
    return true;
  }
}

export class BooleanValue extends PrimitiveValue {
  constructor(realm, boolean) {
    super(realm);
    this.boolean = boolean;
  }

  booleanValue() {
    return this.boolean;
  }
}

export class NumberValue extends PrimitiveValue {
  constructor(realm, number) {
    super(realm);
    this.number = number;
  }

  numberValue() {
    return this.number;
  }
}

export class StringValue extends PrimitiveValue {
  constructor(realm, string) {
    super(realm);
    this.string = string;
  }

  stringValue() {
    return this.string;
  }
}

export class SymbolValue extends PrimitiveValue {
  constructor(realm, Description) {
    super(realm);
    this.Description = Description;
  }
}

class InternalPropertyMap extends Map {
  get(name) {
    if (name instanceof StringValue) {
      name = name.stringValue();
    }
    return super.get(name);
  }

  set(name, value) {
    if (name instanceof StringValue) {
      name = name.stringValue();
    }

    return super.set(name, value);
  }

  has(name) {
    if (name instanceof StringValue) {
      name = name.stringValue();
    }

    return super.has(name);
  }

  delete(name) {
    if (name instanceof StringValue) {
      name = name.value;
    }

    return super.delete(name);
  }
}

export class ObjectValue extends PrimitiveValue {
  constructor(realm, Prototype) {
    super(realm);

    this.Prototype = Prototype
      || realm.Intrinsics['%ObjectPrototype%']
      || new NullValue(realm);

    this.Extensible = true;
    this.IsClassPrototype = false;
    this.properties = new InternalPropertyMap();
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
    if (P.stringValue() === 'length') {
      return ArraySetLength(A, Desc);
    }
    if (IsArrayIndex(P)) {
      const oldLenDesc = OrdinaryGetOwnProperty(A, 'length');
      Assert(oldLenDesc !== undefined && !IsAccessorDescriptor(oldLenDesc));
      const oldLen = oldLenDesc.Value;
      const index = ToUint32(P);
      if (index.value >= oldLen.value && oldLenDesc.Writable === false) {
        return false;
      }
      const succeeded = OrdinaryDefineOwnProperty(A, P, Desc);
      if (succeeded === false) {
        return false;
      }
      if (index.value >= oldLen.value) {
        oldLenDesc.Value = New(index + 1);
        const succeeded = OrdinaryDefineOwnProperty(A, 'length', oldLenDesc);
        Assert(succeeded === true);
      }
      return true;
    }
    return OrdinaryDefineOwnProperty(A, P, Desc);
  }
}

export class FunctionValue extends ObjectValue {}

export class BuiltInFunctionValue extends FunctionValue {
  constructor(realm, nativeFunction) {
    super(realm);
    this.nativeFunction = nativeFunction;
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
    const result = this.nativeFunction(calleeRealm, argumentsList, {
      thisArgument,
      NewTarget: undefined,
    });
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
    const result = this.nativeFunction(calleeRealm, argumentsList, {
      thisArgument: undefined,
      NewTarget: newTarget,
    });
    surroundingAgent.executionContextStack.pop();
    return result;
  }
}

export class ProxyValue extends ObjectValue {
  constructor(realm) {
    super(realm);

    this.ProxyTarget = undefined;
    this.ProxyHandler = undefined;
  }

  GetPrototypeOf() {
    const O = this;
    const handler = O.ProxyHandler;
    if (handler.value === null) {
      surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, 'getPrototypeOf');
    if (trap.value === undefined) {
      return target.GetPrototypeOf();
    }
    const handlerProto = Call(trap, handler, [target]);
    if (Type(handlerProto) !== 'Object' && Type(handlerProto) !== 'Null') {
      surroundingAgent.Throw('TypeError');
    }
    const extensibleTarget = IsExtensible(target);
    if (extensibleTarget === true) {
      return handlerProto;
    }
    const targetProto = target.GetPrototypeOf();
    if (SameValue(handlerProto, targetProto) === false) {
      surroundingAgent.Throw('TypeError');
    }
    return handlerProto;
  }

  SetPrototypeOf(V) {
    const O = this;

    Assert(Type(V) === 'Object' || Type(V) === 'Null');
    const handler = O.ProxyHandler;
    if (handler.value === null) {
      surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, 'setPrototypeOf');
    if (trap.value === undefined) {
      return target.SetPrototypeOf(V);
    }
    const booleanTrapResult = ToBoolean(Call(trap, handler, [target, V]));
    if (booleanTrapResult.value === false) {
      return false;
    }
    const extensibleTarget = IsExtensible(target);
    if (extensibleTarget === true) {
      return true;
    }
    const targetProto = target.GetPrototypeOf();
    if (SameValue(V, targetProto)) {
      surroundingAgent.Throw('TypeError');
    }
    return true;
  }

  IsExtensible() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler.value === null) {
      surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, 'isExtensible');
    if (trap.value === undefined) {
      return target.IsExtensible();
    }
    const booleanTrapResult = ToBoolean(Call(trap, handler, [target]));
    const targetResult = target.IsExtensible();
    if (SameValue(booleanTrapResult, targetResult) === false) {
      surroundingAgent.Throw('TypeError');
    }
    return booleanTrapResult;
  }

  PreventExtensions() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler.value === null) {
      surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, 'PreventExtensions');
    if (trap.value === undefined) {
      return target.PreventExtensions();
    }
    const booleanTrapResult = ToBoolean(Call(trap, handler, [target]));
    if (booleanTrapResult.value === true) {
      const targetIsExtensible = target.IsExtensible();
      if (targetIsExtensible === true) {
        surroundingAgent.Throw('TypeError');
      }
    }
    return booleanTrapResult;
  }

  GetOwnProperty(P) {}

  DefineOwnProperty(P, Desc) {}

  HasProperty(P) {}

  Get(P, Receiver) {}

  Set(P, V, Receiver) {}

  Delete(P) {}

  OwnPropertyKeys() {}

  Call(thisArgument, argumentsList) {}

  Construct(argumentsList, newTarget) {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler.value === null) {
      surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, 'construct');
    if (trap.value === undefined) {
      Assert(IsConstructor(target));
      return Construct(target, argumentsList, newTarget);
    }
    const argArray = CreateArrayFromList(argumentsList);
    const newObj = Call(trap, handler, [target, argArray, newTarget]);
    if (Type(newObj) !== 'Object') {
      surroundingAgent.Throw('TypeError');
    }
    return newObj;
  }
}

export function New(value, realm = surroundingAgent.currentRealmRecord) {
  if (value === null) {
    return new NullValue(realm);
  }

  if (value === undefined) {
    return new UndefinedValue(realm);
  }

  if (typeof value === 'string') {
    return new StringValue(realm, value);
  }

  if (typeof value === 'number') {
    return new NumberValue(realm, value);
  }

  if (typeof value === 'boolean') {
    return new BooleanValue(realm, value);
  }

  if (typeof value === 'symbol') {
    return new SymbolValue(realm, value);
  }

  if (typeof value === 'function') {
    return new BuiltInFunctionValue(realm, value);
  }

  throw new RangeError('NewValue type out of range');
}
