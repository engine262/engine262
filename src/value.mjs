/* @flow */

/* ::
import type {
  Realm,
} from './engine.mjs';

import type {
  List,
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

export class Value {}

export class PrimitiveValue extends Value {}

export class UndefinedValue extends PrimitiveValue {}
export const undefinedValue = new UndefinedValue();

export class NullValue extends PrimitiveValue {}
export const nullValue = new NullValue();

export class BooleanValue extends PrimitiveValue {
  /* :: boolean: boolean */
  constructor(boolean /* : boolean */) {
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
export const trueValue = new BooleanValue(true);
export const falseValue = new BooleanValue(false);

export class NumberValue extends PrimitiveValue {
  /* :: number: number */
  constructor(number /* : number */) {
    super();
    this.number = number;
  }

  numberValue() /* : number */ {
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
  /* :: string: String */
  constructor(string /* : String */) {
    super();
    this.string = string;
  }

  stringValue() {
    return this.string;
  }
}

export class SymbolValue extends PrimitiveValue {
  /* :: Description: UndefinedValue|StringValue */
  constructor(Description /* : StringValue */) {
    super();
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
  realm: Realm
  Prototype: NullValue | ObjectValue
  Extensible: boolean
  IsClassPrototype: boolean
  properties: InternalPropertyMap
  */
  constructor(realm /* : Realm */, Prototype /* : ?(NullValue | ObjectValue) */) {
    super();

    this.realm = realm;
    this.Prototype = Prototype
      // $FlowFixMe
      || realm.Intrinsics['%ObjectPrototype%']
      || nullValue;

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
    if (P instanceof StringValue && P.stringValue() === 'length') {
      return ArraySetLength(A, Desc);
    }
    if (isArrayIndex(P)) {
      const oldLenDesc = OrdinaryGetOwnProperty(A, New('length'));
      Assert(!(oldLenDesc instanceof UndefinedValue) && !IsAccessorDescriptor(oldLenDesc));
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
  /* ::
  Contruct: ?function
  */

  Call(thisArgument /* : Value */, argumentsList /* : Value[] */) {
    throw new TypeError('This function object does not have [[Call]] implemented');
  }
}

/* ::
export type BuiltinFunctionCallback = (realm: Realm, argumentsList: Value[], contextInfo: {
  thisArgument: Value,
  NewTarget: Value,
}) => Value;
*/

export class BuiltinFunctionValue extends FunctionValue {
  /* ::
  Realm: ?Realm
  ScriptOrModule: ?ScriptOrModule
  nativeFunction: BuiltinFunctionCallback
  */

  constructor(realm /* : Realm */, nativeFunction /* : BuiltinFunctionCallback */) {
    // Unless otherwise specified every built-in function object has the
    // %FunctionPrototype% object as the initial value of its [[Prototype]]
    // internal slot.
    super(realm, realm.Intrinsics['%FunctionPrototype%']);
    this.nativeFunction = nativeFunction;
    // Will be filled in CreateBuiltinFunction.
    this.Realm = undefined;
    this.ScriptOrModule = undefined;
  }

  Call(thisArgument /* : Value */, argumentsList /* : List<Value> */) {
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

  Construct(argumentsList /* : List<Value> */, newTarget /* : Value */) {
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
    ProxyTarget /* : ObjectValue */,
    ProxyHandler /* : NullValue | ObjectValue */,
  ) {
    super();

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
declare function New(function, ?Realm): BuiltinFunctionValue;
*/

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

  // $FlowFixMe 'symbol' isn't valid for typeof
  if (typeof value === 'symbol') {
    return new SymbolValue(value);
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
