/* @flow */

/* ::
import type {
  Realm,
} from './engine.mjs';

import type {
  PropertyDescriptor,
} from './abstract-ops/all.mjs';
*/

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
} from './abstract-ops/all.mjs';

export class Value {
  /* :: realm: Realm; */
  constructor(realm /* : Realm */) {
    this.realm = realm;
  }
}

export class PrimitiveValue extends Value {}

export class UndefinedValue extends PrimitiveValue {}

export class NullValue extends PrimitiveValue {}

export class BooleanValue extends PrimitiveValue {
  /* :: boolean: Boolean */
  constructor(realm /* : Realm */, boolean /* : Boolean */) {
    super(realm);
    this.boolean = boolean;
  }

  isTrue() {
    return this.boolean === true;
  }

  isFalse() {
    return this.boolean === false;
  }
}

export class NumberValue extends PrimitiveValue {
  /* :: number: Number */
  constructor(realm /* : Realm */, number /* : Number */) {
    super(realm);
    this.number = number;
  }

  numberValue() {
    return this.number;
  }

  isNaN() {
    return Number.isNaN(this.number);
  }
}

export class StringValue extends PrimitiveValue {
  /* :: string: String */
  constructor(realm /* : Realm */, string /* : String */) {
    super(realm);
    this.string = string;
  }

  stringValue() {
    return this.string;
  }
}

export class SymbolValue extends PrimitiveValue {
  /* :: Description: UndefinedValue|StringValue */
  constructor(realm /* : Realm */, Description /* : StringValue */) {
    super(realm);
    this.Description = Description;
  }
}

class InternalPropertyMap extends Map /* <Value, Value> */ {
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
      name = name.stringValue();
    }

    return super.delete(name);
  }
}

/* :: export type PropertyKey = StringValue | SymbolValue; */
export class ObjectValue extends PrimitiveValue {
  /* ::
  Prototype: NullValue | ObjectValue
  Extensible: boolean
  IsClassPrototype: boolean
  properties: InternalPropertyMap
  */
  constructor(realm /* : Realm */, Prototype /* : ?NullValue | ?ObjectValue */) {
    super(realm);

    this.Prototype = Prototype
      // $FlowFixMe
      || realm.Intrinsics['%ObjectPrototype%']
      || new NullValue(realm);

    this.Extensible = true;
    this.IsClassPrototype = false;
    this.properties = new InternalPropertyMap();
  }

  GetPrototypeOf() {
    return OrdinaryGetPrototypeOf(this);
  }

  SetPrototypeOf(V /* : NullValue | ObjectValue */) {
    return OrdinarySetPrototypeOf(this, V);
  }

  IsExtensible() {
    return OrdinaryIsExtensible(this);
  }

  PreventExtensions() {
    return OrdinaryPreventExtensions(this);
  }

  GetOwnProperty(P /* : Value */) {
    return OrdinaryGetOwnProperty(this, P);
  }

  DefineOwnProperty(P /* : Value */, Desc /* : PropertyDescriptor */) {
    return OrdinaryDefineOwnProperty(this, P, Desc);
  }

  HasProperty(P /* : Value */) {
    return OrdinaryHasProperty(this, P);
  }

  Get(P /* : Value */, Receiver /* : Value */) {
    return OrdinaryGet(this, P, Receiver);
  }

  Set(P /* : Value */, V /* : Value */, Receiver /* : Value */) {
    return OrdinarySet(this, P, V, Receiver);
  }

  Delete(P /* : Value */) {
    return OrdinaryDelete(this, P);
  }

  OwnPropertyKeys() {
    return OrdinaryOwnPropertyKeys(this);
  }
}

export class ArrayValue extends ObjectValue {
  DefineOwnProperty(P /* : Value */, Desc /* : PropertyDescriptor */) {
    const A = this;

    Assert(IsPropertyKey(P));
    if (P.stringValue() === 'length') {
      return ArraySetLength(A, Desc);
    }
    if (isArrayIndex(P)) {
      const oldLenDesc = OrdinaryGetOwnProperty(A, 'length');
      Assert(oldLenDesc !== undefined && !IsAccessorDescriptor(oldLenDesc));
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
        const succeeded = OrdinaryDefineOwnProperty(A, 'length', oldLenDesc);
        Assert(succeeded === true);
      }
      return true;
    }
    return OrdinaryDefineOwnProperty(A, P, Desc);
  }
}

export class FunctionValue extends ObjectValue {
  /* ::
  Realm: Realm
  ScriptOrModule: ?ScriptOrModule
  */
  Call(thisArgument /* : Value */, argumentsList /* : Value[] */) {
    throw new TypeError('This function object does not have [[Call]] implemented');
  }
  Construct(argumentsList /* : Value[] */, newTarget /* : Value */) {
    throw new TypeError('This function object does not have [[Construct]] implemented');
  }
}

/* ::
declare type BuiltinFunctionCallback = (realm: Realm, argumentsList: Value[], contextInfo: {
  thisArgument: Value,
  NewTarget: Value,
}) => Value;
export type { BuiltinFunctionCallback };
*/

export class BuiltinFunctionValue extends FunctionValue {
  /* ::
  nativeFunction: BuiltinFunctionCallback
  */
  constructor(realm /* : Realm */, nativeFunction /* : BuiltinFunctionCallback */) {
    super(realm);
    this.nativeFunction = nativeFunction;
  }

  Call(thisArgument /* : Value */, argumentsList /* : Value[] */) {
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
      NewTarget: New(undefined),
    });
    surroundingAgent.executionContextStack.pop();

    return result;
  }

  Construct(argumentsList /* : Value[] */, newTarget /* : Value */) {
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
      thisArgument: New(undefined),
      NewTarget: newTarget,
    });
    surroundingAgent.executionContextStack.pop();
    return result;
  }
}

export class ProxyValue extends ObjectValue {
  /* ::
  ProxyTarget: ObjectValue | FunctionValue
  ProxyHandler: NullValue | ObjectValue
  */
  constructor(
    realm /* : Realm */,
    ProxyTarget /* : ObjectValue */,
    ProxyHandler /* : NullValue | ObjectValue */,
  ) {
    super(realm);

    this.ProxyTarget = ProxyTarget;
    this.ProxyHandler = ProxyHandler;

    if (ProxyTarget instanceof FunctionValue) {
      this.Call = (thisArgument /* : Value */, argumentsList /* : Value[] */) => {
        const O = this;

        const handler = O.ProxyHandler;
        if (handler instanceof NullValue) {
          surroundingAgent.Throw('TypeError');
        }
        Assert(Type(handler) === 'Object');
        const target = O.ProxyTarget;
        const trap = GetMethod(handler, New('apply'));
        if (trap instanceof UndefinedValue) {
          return Call(target, thisArgument, argumentsList);
        }
        const argArray = CreateArrayFromList(argumentsList);
        return Call(trap, handler, [target, thisArgument, argArray]);
      };
    }

    if ('Construct' in ProxyTarget) {
      this.Construct = (argumentsList /* : Value[] */, newTarget /* : Value */) => {
        const O = this;

        const handler = O.ProxyHandler;
        if (handler instanceof NullValue) {
          surroundingAgent.Throw('TypeError');
        }
        Assert(Type(handler) === 'Object');
        const target = O.ProxyTarget;
        const trap = GetMethod(handler, New('construct'));
        if (trap instanceof UndefinedValue) {
          Assert(IsConstructor(target));
          return Construct(target, argumentsList, newTarget);
        }
        const argArray = CreateArrayFromList(argumentsList);
        const newObj = Call(trap, handler, [target, argArray, newTarget]);
        if (Type(newObj) !== 'Object') {
          surroundingAgent.Throw('TypeError');
        }
        return newObj;
      };
    }
  }

  GetPrototypeOf() {
    const O = this;
    const handler = O.ProxyHandler;
    if (handler instanceof NullValue) {
      surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, 'getPrototypeOf');
    if (trap instanceof UndefinedValue) {
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

  SetPrototypeOf(V /* : NullValue | ObjectValue */) {
    const O = this;

    Assert(Type(V) === 'Object' || Type(V) === 'Null');
    const handler = O.ProxyHandler;
    if (handler instanceof NullValue) {
      surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, New('setPrototypeOf'));
    if (trap instanceof UndefinedValue) {
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
      surroundingAgent.Throw('TypeError');
    }
    return true;
  }

  IsExtensible() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler instanceof NullValue) {
      surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, New('isExtensible'));
    if (trap instanceof UndefinedValue) {
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
    if (handler instanceof NullValue) {
      surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, New('PreventExtensions'));
    if (trap instanceof UndefinedValue) {
      return target.PreventExtensions();
    }
    const booleanTrapResult = ToBoolean(Call(trap, handler, [target]));
    if (booleanTrapResult.isTrue()) {
      const targetIsExtensible = target.IsExtensible();
      if (targetIsExtensible === true) {
        surroundingAgent.Throw('TypeError');
      }
    }
    return booleanTrapResult;
  }

  GetOwnProperty(P /* : Value */) {}

  DefineOwnProperty(P /* : Value */, Desc /* : PropertyDescriptor */) {}

  HasProperty(P /* : Value */) {}

  Get(P /* : Value */, Receiver /* : Value */) {}

  Set(P /* : Value */, V /* : Value */, Receiver /* : Value */) {}

  Delete(P /* : Value */) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler instanceof NullValue) {
      surroundingAgent.Throw('TypeError');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = GetMethod(handler, New('deleteProperty'));
    if (trap instanceof UndefinedValue) {
      return target.Delete(P);
    }
    const booleanTrapResult = ToBoolean(Call(trap, handler, [target, P]));
    if (booleanTrapResult.isFalse()) {
      return New(false);
    }
    const targetDesc = target.GetOwnProperty(P);
    if (targetDesc instanceof UndefinedValue) {
      return New(true);
    }
    if (targetDesc.Configurable === false) {
      surroundingAgent.Throw('TypeError');
    }
    return New(true);
  }

  OwnPropertyKeys() {}
}

/* ::
type symbol = Symbol;

declare function New(null, ?Realm): NullValue;
declare function New(void, ?Realm): UndefinedValue;
declare function New(string, ?Realm): StringValue;
declare function New(number, ?Realm): NumberValue;
declare function New(boolean, ?Realm): BooleanValue;
declare function New(symbol, ?Realm): SymbolValue;
declare function New(function, ?Realm): FunctionValue;
*/

export function New(value, realm) {
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

  // $FlowFixMe 'symbol' isn't valid for typeof
  if (typeof value === 'symbol') {
    return new SymbolValue(realm, value);
  }

  if (typeof value === 'function') {
    return new BuiltinFunctionValue(realm, value);
  }

  throw new RangeError('NewValue type out of range');
}

/* ::
declare function Type(UndefinedValue): 'Undefined';
declare function Type(NullValue): 'Null';
declare function Type(BooleanValue): 'Boolean';
declare function Type(StringValue): 'String';
declare function Type(NumberValue): 'Number';
declare function Type(SymbolValue): 'Symbol';
declare function Type(ObjectValue): 'Object';
declare function Type(Value): string;
*/

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

  throw new RangeError('Type(val) invalid argument');
}
