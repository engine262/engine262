import {
  Descriptor,
  Type, JSStringValue, BooleanValue,
  Value,
  ObjectValue,
  wellKnownSymbols,
  type PropertyKeyValue,
  UndefinedValue,
  NullValue,
  type Arguments,
} from '../value.mts';
import {
  surroundingAgent,
} from '../engine.mts';
import { InstanceofOperator } from '../runtime-semantics/all.mts';
import {
  NormalCompletion,
  EnsureCompletion,
  Q, X,
  type ExpressionCompletion,
  type PlainCompletion,
} from '../completion.mts';
import { isArray } from '../helpers.mts';
import { isBoundFunctionObject } from '../intrinsics/FunctionPrototype.mts';
import {
  ArrayCreate,
  Assert,
  IsAccessorDescriptor,
  IsCallable,
  IsConstructor,
  IsDataDescriptor,
  IsExtensible,
  IsPropertyKey,
  SameValue,
  ToLength,
  ToObject,
  ToString,
  isProxyExoticObject,
  F as toNumberValue, R, type FunctionObject, Realm,
} from './all.mts';


// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-operations-on-objects */

/** https://tc39.es/ecma262/#sec-makebasicobject */
export function MakeBasicObject<const T extends string>(internalSlotsList: readonly T[]) {
  // 1.  Assert: internalSlotsList is a List of internal slot names.
  Assert(isArray(internalSlotsList));
  // 2.  Let obj be a newly created object with an internal slot for each name in internalSlotsList.
  // 3.  Set obj's essential internal methods to the default ordinary object definitions specified in 9.1.
  const obj = new ObjectValue(internalSlotsList) as ObjectValue & Record<T, unknown>;
  Object.assign(obj, internalSlotsList.reduce((extraFields, currentField) => {
    extraFields[currentField] = Value.undefined;
    return extraFields;
  }, {} as Record<T, unknown>));
  // 4.  Assert: If the caller will not be overriding both obj's [[GetPrototypeOf]] and [[SetPrototypeOf]] essential internal methods, then internalSlotsList contains [[Prototype]].
  // 5.  Assert: If the caller will not be overriding all of obj's [[SetPrototypeOf]], [[IsExtensible]], and [[PreventExtensions]] essential internal methods, then internalSlotsList contains [[Extensible]].
  // 6.  If internalSlotsList contains [[Extensible]], then set obj.[[Extensible]] to true.
  if ((internalSlotsList as readonly string[]).includes('Extensible')) {
    (obj as ObjectValue & { Extensible: BooleanValue }).Extensible = Value.true;
  }
  // 7.  Return obj.
  return obj;
}

/** https://tc39.es/ecma262/#sec-get-o-p */
export function Get(O: ObjectValue, P: PropertyKeyValue): ExpressionCompletion {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  // TODO: This should just return Q(O.Get(P, O))
  return NormalCompletion(Q(O.Get(P, O)));
}

/** https://tc39.es/ecma262/#sec-getv */
export function GetV(V: Value, P: PropertyKeyValue): ExpressionCompletion {
  Assert(IsPropertyKey(P));
  const O = Q(ToObject(V));
  return Q(O.Get(P, V));
}

/** https://tc39.es/ecma262/#sec-set-o-p-v-throw */
export function Set(O: ObjectValue, P: PropertyKeyValue, V: Value, Throw: BooleanValue) {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  Assert(Throw instanceof BooleanValue);
  const success = Q(O.Set(P, V, O));
  if (success === Value.false && Throw === Value.true) {
    return surroundingAgent.Throw('TypeError', 'CannotSetProperty', P, O);
  }
  return success;
}

/** https://tc39.es/ecma262/#sec-createdataproperty */
export function CreateDataProperty(O: ObjectValue, P: PropertyKeyValue, V: Value): ExpressionCompletion<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));

  const newDesc = Descriptor({
    Value: V,
    Writable: Value.true,
    Enumerable: Value.true,
    Configurable: Value.true,
  });
  return Q(O.DefineOwnProperty(P, newDesc));
}

/** https://tc39.es/ecma262/#sec-createmethodproperty */
export function CreateMethodProperty(O: ObjectValue, P: PropertyKeyValue, V: Value): ExpressionCompletion<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));

  const newDesc = Descriptor({
    Value: V,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  });
  return Q(O.DefineOwnProperty(P, newDesc));
}

/** https://tc39.es/ecma262/#sec-createdatapropertyorthrow */
export function CreateDataPropertyOrThrow(O: ObjectValue, P: PropertyKeyValue, V: Value) {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  const success = Q(CreateDataProperty(O, P, V));
  if (success === Value.false) {
    return surroundingAgent.Throw('TypeError', 'CannotDefineProperty', P);
  }
  return success;
}

/** https://tc39.es/ecma262/#sec-definepropertyorthrow */
export function DefinePropertyOrThrow(O: ObjectValue, P: PropertyKeyValue, desc: Descriptor) {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  const success = Q(O.DefineOwnProperty(P, desc));
  if (success === Value.false) {
    return surroundingAgent.Throw('TypeError', 'CannotDefineProperty', P);
  }
  return success;
}

/** https://tc39.es/ecma262/#sec-deletepropertyorthrow */
export function DeletePropertyOrThrow(O: ObjectValue, P: PropertyKeyValue) {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  const success = Q(O.Delete(P));
  if (success === Value.false) {
    return surroundingAgent.Throw('TypeError', 'CannotDeleteProperty', P);
  }
  return success;
}

/** https://tc39.es/ecma262/#sec-getmethod */
export function GetMethod(V: Value, P: PropertyKeyValue): ExpressionCompletion<UndefinedValue | FunctionObject> {
  Assert(IsPropertyKey(P));
  const func = Q(GetV(V, P));
  if (func === Value.null || func === Value.undefined) {
    return Value.undefined;
  }
  if (IsCallable(func) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', func);
  }
  return func as FunctionObject;
}

/** https://tc39.es/ecma262/#sec-hasproperty */
export function HasProperty(O: ObjectValue, P: PropertyKeyValue): ExpressionCompletion<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  return Q(O.HasProperty(P));
}

/** https://tc39.es/ecma262/#sec-hasownproperty */
export function HasOwnProperty(O: ObjectValue, P: PropertyKeyValue): ExpressionCompletion<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  const desc = Q(O.GetOwnProperty(P));
  if (desc === Value.undefined) {
    return Value.false;
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-call */
export function Call(F: Value, V: Value, argumentsList: Arguments = []) {
  Assert(argumentsList.every((a) => a instanceof Value));

  if (IsCallable(F) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', F);
  }

  return EnsureCompletion(Q((F as FunctionObject).Call(V, argumentsList)));
}

/** https://tc39.es/ecma262/#sec-construct */
export function Construct(F: FunctionObject, argumentsList: Arguments = [], newTarget?: FunctionObject | UndefinedValue): ExpressionCompletion<ObjectValue> {
  if (!newTarget) {
    newTarget = F;
  }
  Assert(IsConstructor(F) === Value.true);
  Assert(IsConstructor(newTarget) === Value.true);
  return Q(F.Construct(argumentsList, newTarget));
}

/** https://tc39.es/ecma262/#sec-setintegritylevel */
export function SetIntegrityLevel(O: ObjectValue, level: 'sealed' | 'frozen'): ExpressionCompletion<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(level === 'sealed' || level === 'frozen');
  const status = Q(O.PreventExtensions());
  if (status === Value.false) {
    return Value.false;
  }
  const keys = Q(O.OwnPropertyKeys());
  if (level === 'sealed') {
    for (const k of keys) {
      Q(DefinePropertyOrThrow(O, k, Descriptor({ Configurable: Value.false })));
    }
  } else if (level === 'frozen') {
    for (const k of keys) {
      const currentDesc = Q(O.GetOwnProperty(k));
      if (currentDesc !== Value.undefined) {
        let desc;
        if (IsAccessorDescriptor(currentDesc) === true) {
          desc = Descriptor({ Configurable: Value.false });
        } else {
          desc = Descriptor({ Configurable: Value.false, Writable: Value.false });
        }
        Q(DefinePropertyOrThrow(O, k, desc));
      }
    }
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-testintegritylevel */
export function TestIntegrityLevel(O: ObjectValue, level: 'sealed' | 'frozen'): ExpressionCompletion<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(level === 'sealed' || level === 'frozen');
  const extensible = Q(IsExtensible(O));
  if (extensible === Value.true) {
    return Value.false;
  }
  const keys = Q(O.OwnPropertyKeys());
  for (const k of keys) {
    const currentDesc = Q(O.GetOwnProperty(k));
    if (!(currentDesc instanceof UndefinedValue)) {
      if (currentDesc.Configurable === Value.true) {
        return Value.false;
      }
      if (level === 'frozen' && IsDataDescriptor(currentDesc)) {
        if (currentDesc.Writable === Value.true) {
          return Value.false;
        }
      }
    }
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-createarrayfromlist */
export function CreateArrayFromList(elements: Arguments) {
  // 1. Assert: elements is a List whose elements are all ECMAScript language values.
  Assert(elements.every((e) => e instanceof Value));
  // 2. Let array be ! ArrayCreate(0).
  const array = X(ArrayCreate(0));
  // 3. Let n be 0.
  let n = 0;
  // 4. For each element e of elements, do
  for (const e of elements) {
    // a. Perform ! CreateDataPropertyOrThrow(array, ! ToString(𝔽(n)), e).
    X(CreateDataPropertyOrThrow(array, X(ToString(toNumberValue(n))), e));
    // b. Set n to n + 1.
    n += 1;
  }
  // 5. Return array.
  return array;
}

/** https://tc39.es/ecma262/#sec-lengthofarraylike */
export function LengthOfArrayLike(obj: ObjectValue): PlainCompletion<number> {
  // 1. Assert: Type(obj) is Object.
  Assert(obj instanceof ObjectValue);
  // 2. Return ℝ(? ToLength(? Get(obj, "length"))).
  return R(Q(ToLength(Q(Get(obj, Value('length'))))));
}

type ElementType = 'Boolean' | 'String' | 'Symbol' | 'BigInt' | 'Object' | 'Undefined' | 'Null' | 'Number';
/** https://tc39.es/ecma262/#sec-createlistfromarraylike */
export function CreateListFromArrayLike(obj: Value, elementTypes?: readonly ElementType[]) {
  // 1. If elementTypes is not present, set elementTypes to « Undefined, Null, Boolean, String, Symbol, Number, BigInt, Object ».
  if (!elementTypes) {
    elementTypes = ['Undefined', 'Null', 'Boolean', 'String', 'Symbol', 'Number', 'BigInt', 'Object'];
  }
  // 2. If Type(obj) is not Object, throw a TypeError exception.
  if (!(obj instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', obj);
  }
  // 3. Let len be ? LengthOfArrayLike(obj).
  const len = Q(LengthOfArrayLike(obj));
  // 4. Let list be a new empty List.
  const list = [];
  // 5. Let index be 0.
  let index = 0;
  // 6. Repeat, while index < len,
  while (index < len) {
    // a. Let indexName be ! ToString(𝔽(index)).
    const indexName = X(ToString(toNumberValue(index)));
    // b. Let next be ? Get(obj, indexName).
    const next = Q(Get(obj, indexName));
    // c. If Type(next) is not an element of elementTypes, throw a TypeError exception.
    if (!(elementTypes as string[]).includes(Type(next))) {
      return surroundingAgent.Throw('TypeError', 'NotPropertyName', next);
    }
    // d. Append next as the last element of list.
    list.push(next);
    // e. Set index to index + 1.
    index += 1;
  }
  // 7. Return list.
  return list;
}

/** https://tc39.es/ecma262/#sec-invoke */
export function Invoke(V: Value, P: PropertyKeyValue, argumentsList: Arguments = []): ExpressionCompletion {
  Assert(IsPropertyKey(P));
  const func = Q(GetV(V, P));
  return Q(Call(func, V, argumentsList));
}

/** https://tc39.es/ecma262/#sec-ordinaryhasinstance */
export function OrdinaryHasInstance(C: Value, O: Value): ExpressionCompletion<BooleanValue> {
  if (IsCallable(C) === Value.false) {
    return Value.false;
  }
  if (isBoundFunctionObject(C)) {
    const BC = C.BoundTargetFunction;
    return Q(InstanceofOperator(O, BC));
  }
  if (!(O instanceof ObjectValue)) {
    return Value.false;
  }
  const P = Q(Get(C as FunctionObject, Value('prototype')));
  if (!(P instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', P);
  }
  while (true) {
    O = Q(O.GetPrototypeOf());
    if (O instanceof NullValue) {
      return Value.false;
    }
    if (SameValue(P, O) === Value.true) {
      return Value.true;
    }
  }
}

/** https://tc39.es/ecma262/#sec-speciesconstructor */
export function SpeciesConstructor(O: ObjectValue, defaultConstructor: FunctionObject): ExpressionCompletion<FunctionObject> {
  Assert(O instanceof ObjectValue);
  const C = Q(Get(O, Value('constructor')));
  if (C === Value.undefined) {
    return defaultConstructor;
  }
  if (!(C instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', C);
  }
  const S = Q(Get(C, wellKnownSymbols.species));
  if (S === Value.undefined || S === Value.null) {
    return defaultConstructor;
  }
  if (IsConstructor(S) === Value.true) {
    return S as FunctionObject;
  }
  return surroundingAgent.Throw('TypeError', 'SpeciesNotConstructor');
}

/** https://tc39.es/ecma262/#sec-enumerableownpropertynames */
export function EnumerableOwnPropertyNames(O: ObjectValue, kind: 'key'): PlainCompletion<JSStringValue[]>
export function EnumerableOwnPropertyNames(O: ObjectValue, kind: 'value'): PlainCompletion<Value[]>
export function EnumerableOwnPropertyNames(O: ObjectValue, kind: 'key' | 'value' | 'key+value'): PlainCompletion<ObjectValue[]>
export function EnumerableOwnPropertyNames(O: ObjectValue, kind: 'key' | 'value' | 'key+value'): PlainCompletion<Value[]> {
  Assert(O instanceof ObjectValue);
  const ownKeys = Q(O.OwnPropertyKeys());
  const properties = [];
  for (const key of ownKeys) {
    if (key instanceof JSStringValue) {
      const desc = Q(O.GetOwnProperty(key));
      if (!(desc instanceof UndefinedValue) && desc.Enumerable === Value.true) {
        if (kind === 'key') {
          properties.push(key);
        } else {
          const value = Q(Get(O, key));
          if (kind === 'value') {
            properties.push(value);
          } else {
            Assert(kind === 'key+value');
            const entry = X(CreateArrayFromList([key, value]));
            properties.push(entry);
          }
        }
      }
    }
  }
  return properties;
}

/** https://tc39.es/ecma262/#sec-getfunctionrealm */
export function GetFunctionRealm(obj: FunctionObject): PlainCompletion<Realm> {
  Assert(X(IsCallable(obj)) === Value.true);
  if ('Realm' in (obj as object)) {
    return obj.Realm;
  }

  if (isBoundFunctionObject(obj)) {
    const target = obj.BoundTargetFunction;
    return Q(GetFunctionRealm(target));
  }

  if (isProxyExoticObject(obj)) {
    if (obj.ProxyHandler instanceof NullValue) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'GetFunctionRealm');
    }
    const proxyTarget = obj.ProxyTarget as FunctionObject;
    return Q(GetFunctionRealm(proxyTarget));
  }

  return surroundingAgent.currentRealmRecord;
}

/** https://tc39.es/ecma262/#sec-copydataproperties */
export function CopyDataProperties(target: ObjectValue, source: Value, excludedItems: readonly PropertyKeyValue[]): ExpressionCompletion<ObjectValue> {
  Assert(target instanceof ObjectValue);
  Assert(excludedItems.every((i) => IsPropertyKey(i)));
  if (source === Value.undefined || source === Value.null) {
    return target;
  }
  const from = X(ToObject(source));
  const keys = Q(from.OwnPropertyKeys());
  for (const nextKey of keys) {
    let excluded = false;
    for (const e of excludedItems) {
      if (SameValue(e, nextKey) === Value.true) {
        excluded = true;
      }
    }
    if (excluded === false) {
      const desc = Q(from.GetOwnProperty(nextKey));
      if (!(desc instanceof UndefinedValue) && desc.Enumerable === Value.true) {
        const propValue = Q(Get(from, nextKey));
        X(CreateDataProperty(target, nextKey, propValue));
      }
    }
  }
  return target;
}
