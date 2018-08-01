import {
  executionContextStack,
  ExecutionContext,
  Assert,
  Type,

  SameValue,
  IsExtensible,
  IsPropertyKey,
  IsArrayIndex,
  IsConstructor,
  GetMethod,

  CreateArrayFromList,
  ArraySetLength,
  Construct,

  ToBoolean,

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
}

export class PrimitiveValue extends Value {
  constructor(realm, value) {
    super(realm);
    this.value = value;
  }
}

export class UndefinedValue extends PrimitiveValue {
  constructor(realm) {
    super(realm, undefined);
  }
}

export class NullValue extends PrimitiveValue {
  constructor(realm) {
    super(realm, null);
  }
}

export class BooleanValue extends PrimitiveValue {}

export class NumberValue extends PrimitiveValue {}

export class StringValue extends PrimitiveValue {}

export class SymbolValue extends PrimitiveValue {
  constructor(realm, Description) {
    super(realm);
    this.Description = Description;
  }
}

class InternalPropertyMap extends Map {
  get(name) {
    if (name instanceof StringValue) {
      name = name.value;
    }
    return super.get(name);
  }

  set(name, value) {
    if (name instanceof StringValue) {
      name = name.value;
    }

    return super.set(name, value);
  }

  has(name) {
    if (name instanceof StringValue) {
      name = name.value;
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

    this.Prototype = Prototype ||
      realm.Intrinsics['%ObjectPrototype%'] ||
      new NullValue(realm);

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
    if (P.value === 'length') {
      return ArraySetLength(A, Desc);
    }
    if (IsArrayIndex(P)) {
      const oldLenDesc = OrdinaryGetOwnProperty(A, 'length');
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

    const callerContext = executionContextStack[executionContextStack.length - 1];
    // If callerContext is not already suspended, suspend callerContext.
    const calleeContext = new ExecutionContext();
    calleeContext.Function = F;
    const calleeRealm = F.Realm;
    calleeContext.Realm = calleeRealm;
    calleeContext.ScriptOrModule = F.ScriptOrModule;

    // 8. Perform any necessary implementation-defined initialization of calleeContext.

    executionContextStack.push(calleeContext);

    const result = this.nativeFunction(calleeRealm, argumentsList, {
      thisArgument,
      NewTarget: undefined,
    });

    executionContextStack.pop();

    return result;
  }

  Construct(argumentsList, newTarget) {
    const F = this;

    const callerContext = executionContextStack[executionContextStack.length - 1];
    // If callerContext is not already suspended, suspend callerContext.
    const calleeContext = new ExecutionContext();
    calleeContext.Function = F;
    const calleeRealm = F.Realm;
    calleeContext.Realm = calleeRealm;
    calleeContext.ScriptOrModule = F.ScriptOrModule;

    // 8. Perform any necessary implementation-defined initialization of calleeContext.

    executionContextStack.push(calleeContext);

    const result = this.nativeFunction(calleeRealm, argumentsList, {
      thisArgument: undefined,
      NewTarget: newTarget,
    });

    executionContextStack.pop();

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
      this.realm.exception.TypeError();
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, 'getPrototypeOf');
    if (trap.value === undefined) {
      return target.GetPrototypeOf();
    }
    const handlerProto = Call(trap, handler, [target]);
    if (Type(handlerProto) !== 'Object' && Type(handlerProto) !== 'Null') {
      this.realm.exception.TypeError();
    }
    const extensibleTarget = IsExtensible(target);
    if (extensibleTarget === true) {
      return handlerProto;
    }
    const targetProto = target.GetPrototypeOf();
    if (SameValue(handlerProto, targetProto) === false) {
      this.realm.exception.TypeError();
    }
    return handlerProto;
  }

  SetPrototypeOf(V) {
    const O = this;

    Assert(Type(V) === 'Object' || Type(V) === 'Null');
    const handler = O.ProxyHandler;
    if (handler.value === null) {
      this.realm.exception.TypeError();
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
      this.realm.exception.TypeError();
    }
    return true;
  }

  IsExtensible() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler.value === null) {
      this.realm.exception.TypeError();
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
      this.realm.exception.TypeError();
    }
    return booleanTrapResult;
  }

  PreventExtensions() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler.value === null) {
      this.realm.exception.TypeError();
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
        this.realm.exception.TypeError();
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
      this.realm.exception.TypeError();
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
      this.realm.exception.TypeError();
    }
    return newObj;
  }
}

export function New(realm, value) {
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
