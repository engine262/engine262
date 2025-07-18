import {
  Descriptor,
  JSStringValue, BooleanValue,
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
} from '../host-defined/engine.mts';
import { InstanceofOperator } from '../runtime-semantics/all.mts';
import {
  EnsureCompletion,
  Q, X,
  type PlainCompletion,
} from '../completion.mts';
import { __ts_cast__, isArray } from '../helpers.mts';
import { isBoundFunctionObject } from '../intrinsics/FunctionPrototype.mts';
import type { PlainEvaluator, ValueEvaluator } from '../evaluator.mts';
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
  RequireObjectCoercible,
  GetIterator,
  ThrowCompletion,
  IteratorClose,
  IteratorStepValue,
  F,
  IfAbruptCloseIterator,
  type ValueCompletion,
  ToPropertyKey,
  CanonicalizeKeyedCollectionKey,
} from '#self';


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
export function* Get(O: ObjectValue, P: PropertyKeyValue): ValueEvaluator {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  return Q(yield* O.Get(P, O));
}

/** https://tc39.es/ecma262/#sec-getv */
export function* GetV(V: Value, P: PropertyKeyValue): ValueEvaluator {
  Assert(IsPropertyKey(P));
  const O = Q(ToObject(V));
  return Q(yield* O.Get(P, V));
}

/** https://tc39.es/ecma262/#sec-set-o-p-v-throw */
export function* Set(O: ObjectValue, P: PropertyKeyValue, V: Value, Throw: BooleanValue) {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  Assert(Throw instanceof BooleanValue);
  const success = Q(yield* O.Set(P, V, O));
  if (success === Value.false && Throw === Value.true) {
    return surroundingAgent.Throw('TypeError', 'CannotSetProperty', P, O);
  }
  return success;
}

/** https://tc39.es/ecma262/#sec-createdataproperty */
export function* CreateDataProperty(O: ObjectValue, P: PropertyKeyValue, V: Value): ValueEvaluator<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));

  const newDesc = Descriptor({
    Value: V,
    Writable: Value.true,
    Enumerable: Value.true,
    Configurable: Value.true,
  });
  return Q(yield* O.DefineOwnProperty(P, newDesc));
}

/** https://tc39.es/ecma262/#sec-createmethodproperty */
export function* CreateMethodProperty(O: ObjectValue, P: PropertyKeyValue, V: Value): ValueEvaluator<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));

  const newDesc = Descriptor({
    Value: V,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  });
  return Q(yield* O.DefineOwnProperty(P, newDesc));
}

/** https://tc39.es/ecma262/#sec-createdatapropertyorthrow */
export function* CreateDataPropertyOrThrow(O: ObjectValue, P: PropertyKeyValue, V: Value) {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  const success = Q(yield* CreateDataProperty(O, P, V));
  if (success === Value.false) {
    return surroundingAgent.Throw('TypeError', 'CannotDefineProperty', P);
  }
  return success;
}

export function CreateNonEnumerableDataPropertyOrThrow(O: ObjectValue, P: PropertyKeyValue, V: Value) {
  Assert(O instanceof ObjectValue);
  const newDesc = Descriptor({
    Value: V,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  });
  X(DefinePropertyOrThrow(O, P, newDesc));
}

/** https://tc39.es/ecma262/#sec-definepropertyorthrow */
export function* DefinePropertyOrThrow(O: ObjectValue, P: PropertyKeyValue, desc: Descriptor) {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  const success = Q(yield* O.DefineOwnProperty(P, desc));
  if (success === Value.false) {
    return surroundingAgent.Throw('TypeError', 'CannotDefineProperty', P);
  }
  return success;
}

/** https://tc39.es/ecma262/#sec-deletepropertyorthrow */
export function* DeletePropertyOrThrow(O: ObjectValue, P: PropertyKeyValue) {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  const success = Q(yield* O.Delete(P));
  if (success === Value.false) {
    return surroundingAgent.Throw('TypeError', 'CannotDeleteProperty', P);
  }
  return success;
}

/** https://tc39.es/ecma262/#sec-getmethod */
export function* GetMethod(V: Value, P: PropertyKeyValue): ValueEvaluator<UndefinedValue | FunctionObject> {
  Assert(IsPropertyKey(P));
  const func = Q(yield* GetV(V, P));
  if (func === Value.null || func === Value.undefined) {
    return Value.undefined;
  }
  if (!IsCallable(func)) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', func);
  }
  return func;
}

/** https://tc39.es/ecma262/#sec-hasproperty */
export function* HasProperty(O: ObjectValue, P: PropertyKeyValue): ValueEvaluator<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  return Q(yield* O.HasProperty(P));
}

/** https://tc39.es/ecma262/#sec-hasownproperty */
export function* HasOwnProperty(O: ObjectValue, P: PropertyKeyValue): ValueEvaluator<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(IsPropertyKey(P));
  const desc = Q(yield* O.GetOwnProperty(P));
  if (desc === Value.undefined) {
    return Value.false;
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-call */
export function* Call(F: Value, V: Value, argumentsList: Arguments = []): ValueEvaluator {
  Assert(argumentsList.every((a) => a instanceof Value));

  if (!IsCallable(F)) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', F);
  }

  return EnsureCompletion(Q(yield* F.Call(V, argumentsList)));
}

/** https://tc39.es/ecma262/#sec-construct */
export function* Construct(F: FunctionObject, argumentsList: Arguments = [], newTarget?: FunctionObject | UndefinedValue): ValueEvaluator<ObjectValue> {
  if (!newTarget) {
    newTarget = F;
  }
  Assert(IsConstructor(F));
  Assert(IsConstructor(newTarget));
  return Q(yield* F.Construct(argumentsList, newTarget));
}

/** https://tc39.es/ecma262/#sec-setintegritylevel */
export function* SetIntegrityLevel(O: ObjectValue, level: 'sealed' | 'frozen'): ValueEvaluator<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(level === 'sealed' || level === 'frozen');
  const status = Q(yield* O.PreventExtensions());
  if (status === Value.false) {
    return Value.false;
  }
  const keys = Q(yield* O.OwnPropertyKeys());
  if (level === 'sealed') {
    for (const k of keys) {
      Q(yield* DefinePropertyOrThrow(O, k, Descriptor({ Configurable: Value.false })));
    }
  } else if (level === 'frozen') {
    for (const k of keys) {
      const currentDesc = Q(yield* O.GetOwnProperty(k));
      if (currentDesc !== Value.undefined) {
        let desc;
        if (IsAccessorDescriptor(currentDesc) === true) {
          desc = Descriptor({ Configurable: Value.false });
        } else {
          desc = Descriptor({ Configurable: Value.false, Writable: Value.false });
        }
        Q(yield* DefinePropertyOrThrow(O, k, desc));
      }
    }
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-testintegritylevel */
export function* TestIntegrityLevel(O: ObjectValue, level: 'sealed' | 'frozen'): ValueEvaluator<BooleanValue> {
  Assert(O instanceof ObjectValue);
  Assert(level === 'sealed' || level === 'frozen');
  const extensible = Q(yield* IsExtensible(O));
  if (extensible === Value.true) {
    return Value.false;
  }
  const keys = Q(yield* O.OwnPropertyKeys());
  for (const k of keys) {
    const currentDesc = Q(yield* O.GetOwnProperty(k));
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
export function* LengthOfArrayLike(obj: ObjectValue): PlainEvaluator<number> {
  // 1. Assert: Type(obj) is Object.
  Assert(obj instanceof ObjectValue);
  // 2. Return ℝ(? ToLength(? Get(obj, "length"))).
  return R(Q(yield* ToLength(Q(yield* Get(obj, Value('length'))))));
}

/** https://tc39.es/ecma262/#sec-createlistfromarraylike */
export function CreateListFromArrayLike(obj: Value, validElementTypes?: undefined | 'all'): PlainEvaluator<Value[]>
export function CreateListFromArrayLike(obj: Value, validElementTypes: 'property-key'): PlainEvaluator<PropertyKeyValue[]>
export function* CreateListFromArrayLike(obj: Value, validElementTypes: 'all' | 'property-key' = 'all'): PlainEvaluator<Value[]> {
  // 2. If Type(obj) is not Object, throw a TypeError exception.
  if (!(obj instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', obj);
  }
  // 3. Let len be ? LengthOfArrayLike(obj).
  const len = Q(yield* LengthOfArrayLike(obj));
  // 4. Let list be a new empty List.
  const list = [];
  // 5. Let index be 0.
  let index = 0;
  // 6. Repeat, while index < len,
  while (index < len) {
    // a. Let indexName be ! ToString(𝔽(index)).
    const indexName = X(ToString(toNumberValue(index)));
    // b. Let next be ? Get(obj, indexName).
    const next = Q(yield* Get(obj, indexName));
    // c. If Type(next) is not an element of elementTypes, throw a TypeError exception.
    if (validElementTypes === 'property-key' && !IsPropertyKey(next)) {
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
export function* Invoke(V: Value, P: PropertyKeyValue, argumentsList: Arguments = []): ValueEvaluator {
  Assert(IsPropertyKey(P));
  const func = Q(yield* GetV(V, P));
  return Q(yield* Call(func, V, argumentsList));
}

/** https://tc39.es/ecma262/#sec-ordinaryhasinstance */
export function* OrdinaryHasInstance(C: Value, O: Value): ValueEvaluator<BooleanValue> {
  if (!IsCallable(C)) {
    return Value.false;
  }
  if (isBoundFunctionObject(C)) {
    const BC = C.BoundTargetFunction;
    return Q(yield* InstanceofOperator(O, BC));
  }
  if (!(O instanceof ObjectValue)) {
    return Value.false;
  }
  const P = Q(yield* Get(C, Value('prototype')));
  if (!(P instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', P);
  }
  while (true) {
    O = Q(yield* O.GetPrototypeOf());
    if (O instanceof NullValue) {
      return Value.false;
    }
    if (SameValue(P, O) === Value.true) {
      return Value.true;
    }
  }
}

/** https://tc39.es/ecma262/#sec-speciesconstructor */
export function* SpeciesConstructor(O: ObjectValue, defaultConstructor: FunctionObject): ValueEvaluator<FunctionObject> {
  Assert(O instanceof ObjectValue);
  const C = Q(yield* Get(O, Value('constructor')));
  if (C === Value.undefined) {
    return defaultConstructor;
  }
  if (!(C instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', C);
  }
  const S = Q(yield* Get(C, wellKnownSymbols.species));
  if (S === Value.undefined || S === Value.null) {
    return defaultConstructor;
  }
  if (IsConstructor(S)) {
    return S;
  }
  return surroundingAgent.Throw('TypeError', 'SpeciesNotConstructor');
}

/** https://tc39.es/ecma262/#sec-enumerableownpropertynames */
export function EnumerableOwnPropertyNames(O: ObjectValue, kind: 'key'): PlainEvaluator<JSStringValue[]>
export function EnumerableOwnPropertyNames(O: ObjectValue, kind: 'value'): PlainEvaluator<Value[]>
export function EnumerableOwnPropertyNames(O: ObjectValue, kind: 'key' | 'value' | 'key+value'): PlainEvaluator<ObjectValue[]>
export function* EnumerableOwnPropertyNames(O: ObjectValue, kind: 'key' | 'value' | 'key+value'): PlainEvaluator<Value[]> {
  Assert(O instanceof ObjectValue);
  const ownKeys = Q(yield* O.OwnPropertyKeys());
  const properties = [];
  for (const key of ownKeys) {
    if (key instanceof JSStringValue) {
      const desc = Q(yield* O.GetOwnProperty(key));
      if (!(desc instanceof UndefinedValue) && desc.Enumerable === Value.true) {
        if (kind === 'key') {
          properties.push(key);
        } else {
          const value = Q(yield* Get(O, key));
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
  Assert(IsCallable(obj));
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
export function* CopyDataProperties(target: ObjectValue, source: Value, excludedItems: readonly PropertyKeyValue[]): ValueEvaluator<ObjectValue> {
  Assert(target instanceof ObjectValue);
  Assert(excludedItems.every((i) => IsPropertyKey(i)));
  if (source === Value.undefined || source === Value.null) {
    return target;
  }
  const from = X(ToObject(source));
  const keys = Q(yield* from.OwnPropertyKeys());
  for (const nextKey of keys) {
    let excluded = false;
    for (const e of excludedItems) {
      if (SameValue(e, nextKey) === Value.true) {
        excluded = true;
      }
    }
    if (excluded === false) {
      const desc = Q(yield* from.GetOwnProperty(nextKey));
      if (!(desc instanceof UndefinedValue) && desc.Enumerable === Value.true) {
        const propValue = Q(yield* Get(from, nextKey));
        X(CreateDataProperty(target, nextKey, propValue));
      }
    }
  }
  return target;
}

/** https://tc39.es/ecma262/#sec-SetterThatIgnoresPrototypeProperties */
export function* SetterThatIgnoresPrototypeProperties(thisValue: Value, home: ObjectValue, p: PropertyKeyValue, v: Value): PlainEvaluator {
  // 1. If thisValue is not an Object, then
  if (!(thisValue instanceof ObjectValue)) {
    // a. Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'NotAnObject', thisValue);
  }
  // 2. If SameValue(thisValue, home) is true, then
  if (SameValue(thisValue, home) === Value.true) {
    // a. NOTE: Throwing here emulates assignment to a non-writable data property on the home object in strict mode code.
    // b. Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotSetProperty', p, thisValue);
  }
  // 3. Let desc be ? thisValue.[[GetOwnProperty]](p).
  const desc = Q(yield* thisValue.GetOwnProperty(p));
  // 4. If desc is undefined, then
  if (desc === Value.undefined) {
    // a. Perform ? CreateDataPropertyOrThrow(thisValue, p, v).
    Q(yield* CreateDataPropertyOrThrow(thisValue, p, v));
  } else { // 5. Else,
    // a. Perform ? Set(thisValue, p, v, true).
    Q(yield* Set(thisValue, p, v, Value.true));
  }
  // 6. Return unused.
  return undefined;
}

export type KeyedGroupRecord = {
  Key: PropertyKeyValue,
  Elements: Value[]
};

/** https://tc39.es/ecma262/#sec-add-value-to-keyed-group */
function AddValueToKeyedGroup(groups: KeyedGroupRecord[], key: PropertyKeyValue, value: Value): void {
  /*
    1. For each Record { [[Key]], [[Elements]] } g of groups, do
      a. If SameValue(g.[[Key]], key) is true, then
        i. Assert: Exactly one element of groups meets this criterion.
        ii. Append value to g.[[Elements]].
        iii. Return unused.
    2. Let group be the Record { [[Key]]: key, [[Elements]]: « value » }.
    3. Append group to groups.
    4. Return unused.
  */
  for (let index = 0; index < groups.length; index += 1) {
    const g = groups[index];
    if (SameValue(g.Key, key) === Value.true) {
      for (let subIndex = index + 1; subIndex < groups.length; subIndex += 1) {
        if (subIndex === index) {
          continue;
        }
        Assert(SameValue(groups[subIndex].Key, key) === Value.false);
      }
      g.Elements.push(value);
      return;
    }
  }

  const group: KeyedGroupRecord = { Key: key, Elements: [value] };
  groups.push(group);
}

export function* GroupBy(items: Value, callback: Value, keyCoercion: 'property' | 'collection'): PlainEvaluator<KeyedGroupRecord[]> {
  /*
  1. Perform ? RequireObjectCoercible(items).
  2. If IsCallable(callback) is false, throw a TypeError exception.
  3. Let groups be a new empty List.
  4. Let iteratorRecord be ? GetIterator(items, sync).
  5. Let k be 0.
  */
  Q(RequireObjectCoercible(items));
  if (!IsCallable(callback)) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callback);
  }
  const groups: KeyedGroupRecord[] = [];
  const iteratorRecord = Q(yield* GetIterator(items, 'sync'));
  let k = 0;
  const MAX_SAFE_INTEGER = (2 ** 53) - 1;

  while (true) {
    /*
    6. Repeat,
      a. If k ≥ 2**53 - 1, then
        i. Let error be ThrowCompletion(a newly created TypeError object).
        ii. Return ? IteratorClose(iteratorRecord, error).
      b. Let next be ? IteratorStepValue(iteratorRecord).
      c. If next is done, then
        i. Return groups.
      d. Let value be next.
      e. Let key be Completion(Call(callback, undefined, « value, 𝔽(k) »)).
      f. IfAbruptCloseIterator(key, iteratorRecord).
      g. If keyCoercion is property, then
        i. Set key to Completion(ToPropertyKey(key)).
        ii. IfAbruptCloseIterator(key, iteratorRecord).
      h. Else,
        i. Assert: keyCoercion is collection.
        ii. Set key to CanonicalizeKeyedCollectionKey(key).
      i. Perform AddValueToKeyedGroup(groups, key, value).
      j. Set k to k + 1.
    */
    if (k >= MAX_SAFE_INTEGER) {
      const error = ThrowCompletion(surroundingAgent.NewError('TypeError', 'OutOfRange', k));
      return Q(yield* IteratorClose(iteratorRecord, error));
    }
    const next: Value | 'done' = Q(yield* IteratorStepValue(iteratorRecord));
    if (next === 'done') {
      return groups;
    }
    const value: Value = next;
    let key: ValueCompletion = yield* Call(callback, Value.undefined, [value, F(k)]);
    IfAbruptCloseIterator(key, iteratorRecord);
    __ts_cast__<Value>(key);

    if (keyCoercion === 'property') {
      key = yield* ToPropertyKey(key);
      IfAbruptCloseIterator(key, iteratorRecord);
    } else {
      Assert(keyCoercion === 'collection');
      key = CanonicalizeKeyedCollectionKey(key);
    }
    __ts_cast__<PropertyKeyValue>(key);

    AddValueToKeyedGroup(groups, key, value);
    k += 1;
  }
}
