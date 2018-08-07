/* @flow */

/* ::
import type {
  BooleanValue,
  ObjectValue,
  FunctionValue,
  PropertyKey,
} from '../value.mjs';
import type {
  List,
  PropertyDescriptor,
} from './spec-types.mjs';
import type {
  Realm,
} from '../realm.mjs';
*/

import {
  Type,
  Value,
  UndefinedValue,
  NullValue,
  ProxyValue,
  New as NewValue,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  IsCallable,
  IsConstructor,
  IsPropertyKey,
  ToObject,
  ToString,
  IsAccessorDescriptor,
  IsDataDescriptor,
  IsExtensible,
} from './all.mjs';
import {
  ArrayCreate,
} from '../intrinsics/Array.mjs';
import {
  Q, X,
} from '../completion.mjs';

// #sec-get-o-p Get
export function Get(O /* : ObjectValue */, P /* : PropertyKey */) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  return Q(O.Get(P, O));
}

// #sec-getv GetV
export function GetV(V /* : Value */, P /* : PropertyKey */) {
  Assert(IsPropertyKey(P));
  const O = ToObject(V);
  return Q(O.Get(V, P));
}

// #sec-set-o-p-v-throw Set
export function Set(
  O /* : ObjectValue */,
  P /* : PropertyKey */,
  V /* : Value */,
  Throw /* : BooleanValue */,
) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  Assert(Type(Throw) === 'Boolean');
  const success = Q(O.Set(P, V, O));
  if (success.isFalse() && Throw.isTrue()) {
    surroundingAgent.Throw('TypeError');
  }
  return success;
}

// 7.3.4 CreateDataProperty
export function CreateDataProperty(O /* : ObjectValue */, P /* : PropertyKey */, V /* : Value */) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));

  const newDesc = {
    Value: V,
    Writable: true,
    Enumerable: true,
    Configurable: true,
  };
  return Q(O.DefineOwnProperty(P, newDesc));
}

// 7.3.6 CreateDataPropertyOrThrow
export function CreateDataPropertyOrThrow(
  O /* : ObjectValue */, P /* : PropertyKey */, V /* : Value */,
) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const success = Q(CreateDataProperty(O, P, V));
  if (success.isFalse()) {
    surroundingAgent.Throw('TypeError');
  }
  return success;
}

// #sec-definepropertyorthrow DefinePropertyOrThrow
export function DefinePropertyOrThrow(
  O /* : ObjectValue */,
  P /* : PropertyKey */,
  desc /* : PropertyDescriptor */,
) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const success = Q(O.DefineOwnProperty(P, desc));
  if (success.isFalse()) {
    surroundingAgent.Throw('TypeError');
  }
  return success;
}

// 7.3.9 GetMethod
export function GetMethod(
  V /* : Value */,
  P /* : PropertyKey */,
) /* : FunctionValue | UndefinedValue */ {
  Assert(IsPropertyKey(P));
  const func = Q(GetV(V, P));
  if (func instanceof NullValue || func instanceof UndefinedValue) {
    return NewValue(undefined);
  }
  if (IsCallable(func) === false) {
    surroundingAgent.Throw('TypeError');
  }
  return func;
}

// 7.3.10 HasProperty
export function HasProperty(O /* : ObjectValue */, P /* : PropertyKey */) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  return Q(O.HasProperty(P));
}

// 7.3.11 HasOwnProperty
export function HasOwnProperty(O /* : ObjectValue */, P /* : PropertyKey */) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const desc = Q(O.GetOwnProperty(P));
  if (desc instanceof UndefinedValue) {
    return NewValue(false);
  }
  return NewValue(true);
}

// 7.3.12 Call
export function Call(F /* : FunctionValue */, V /* : Value */, argumentsList /* : List<Value> */) {
  if (!argumentsList) {
    argumentsList = [];
  }

  if (IsCallable(F) === false) {
    surroundingAgent.Throw('TypeError');
  }

  return Q(F.Call(V, argumentsList));
}

// 7.3.13 Construct
export function Construct(
  F /* : FunctionValue */,
  argumentsList /* : List<Value> */,
  newTarget /* : ?FunctionValue */,
) {
  if (!newTarget) {
    newTarget = F;
  }
  if (!argumentsList) {
    argumentsList = [];
  }
  Assert(IsConstructor(F));
  Assert(IsConstructor(newTarget));
  return Q(F.Construct(argumentsList, newTarget));
}

// #sec-setintegritylevel SetIntegrityLevel
export function SetIntegrityLevel(O /* : ObjectValue */, level /* : string */) {
  Assert(Type(O) === 'Object');
  Assert(level === 'sealed' || level === 'frozen');
  const status = Q(O.PreventExtensions());
  if (status.isFalse()) {
    return NewValue(false);
  }
  const keys = Q(O.OwnPropertyKeys());
  if (level === 'sealed') {
    keys.forEach((k) => {
      Q(DefinePropertyOrThrow(O, k, { Configurable: false }));
    });
  } else if (level === 'frozen') {
    keys.forEach((k) => {
      const currentDesc = Q(O.GetOwnProperty(k));
      if (!(currentDesc instanceof UndefinedValue)) {
        let desc;
        if (IsAccessorDescriptor(currentDesc) === true) {
          desc = { Configurable: false };
        } else {
          desc = { Configurable: false, Writable: false };
        }
        Q(DefinePropertyOrThrow(O, k, desc));
      }
    });
  }
}

// #sec-testintegritylevel TestIntegrityLevel
export function TestIntegrityLevel(O /* : ObjectValue */, level /* : string */) {
  Assert(Type(O) === 'Object');
  Assert(level === 'sealed' || level === 'frozen');
  const status = Q(IsExtensible(O));
  if (status.isTrue()) {
    return NewValue(false);
  }
  const keys = Q(O.OwnPropertyKeys());
  for (const k of keys) {
    const currentDesc = Q(O.GetOwnProperty(k));
    if (!(currentDesc instanceof UndefinedValue)) {
      if (currentDesc.Configurable === true) {
        return NewValue(false);
      }
      if (level === 'frozen' && IsDataDescriptor(currentDesc)) {
        if (currentDesc.Writable === true) {
          return NewValue(false);
        }
      }
    }
  }
  return NewValue(true);
}

// 7.3.16 CreateArrayFromList
export function CreateArrayFromList(elements /* : List<Value> */) {
  Assert(elements.every((e) => e instanceof Value));
  const array = X(ArrayCreate(NewValue(0)));
  let n = 0;
  elements.forEach((e) => {
    const status = CreateDataProperty(array, X(ToString(NewValue(n))), e);
    Assert(status.isTrue());
    n += 1;
  });
  return array;
}

// 7.3.18 Invoke
export function Invoke(V /* : Value */, P /* : PropertyKey */, argumentsList /* : List<Value> */) {
  Assert(IsPropertyKey(P));
  if (!argumentsList) {
    argumentsList = [];
  }
  const func = Q(GetV(V, P));
  return Q(Call(func, V, argumentsList));
}

/* ::
export type OwnPropertyNamesKind = 'key' | 'value' | 'key+value';
*/

// #sec-enumerableownpropertynames EnumerableOwnPropertyNames
export function EnumerableOwnPropertyNames(
  O /* : ObjectValue */,
  kind /* : OwnPropertyNamesKind */,
) {
  Assert(Type(O) === 'Object');
  const ownKeys = Q(O.OwnPropertyKeys());
  const properties = [];
  ownKeys.forEach((key) => {
    if (Type(key) === 'String') {
      const desc = Q(O.GetOwnProperty(key));
      if (!(desc instanceof UndefinedValue) && desc.Enumerable === true) {
        if (kind === 'key') {
          properties.push(key);
        } else {
          const value = Q(Get(O, key));
          if (kind === 'value') {
            properties.push(value);
          } else {
            Assert(kind === 'key+value');
            const entry = CreateArrayFromList([key, value]);
            properties.push(entry);
          }
        }
      }
    }
  });
  // Order the elements of properties so they are in the same relative
  // order as would be produced by the Iterator that would be returned
  // if the EnumerateObjectProperties internal method were invoked with O.
  return properties;
}

// 7.3.22 GetFunctionRealm
export function GetFunctionRealm(obj /* : Value */) /* : Realm */ {
  Assert(IsCallable(obj));
  if ('Realm' in obj) {
    // $FlowFixMe
    return obj.Realm;
  }

  /*
  if (IsBoundFunctionExoticObject(obj)) {
    const target = obj.BoundTargetFunction;
    return GetFunctionRealm(target);
  }
  */

  if (obj instanceof ProxyValue) {
    if (obj.ProxyHandler instanceof NullValue) {
      surroundingAgent.Throw('TypeError');
    }
    const proxyTarget = obj.ProxyTarget;
    return Q(GetFunctionRealm(proxyTarget));
  }

  return surroundingAgent.currentRealmRecord;
}
