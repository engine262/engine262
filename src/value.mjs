import {
  executionContextStack,
  ExecutionContext,

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

export class SymbolValue extends PrimitiveValue {}

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
  constructor(realm) {
    super(realm);
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

export class ArrayValue extends ObjectValue {}

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

    const result = this.nativeFunction(thisArgument, argumentsList);

    executionContextStack.pop();

    return result;
  }
}

export class ProxyValue extends ObjectValue {}

export function New(realm, value) {
  if (value === null) {
    return new NullValue();
  }

  if (value === undefined) {
    return new UndefinedValue();
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
