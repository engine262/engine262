/* @flow */

/* ::
import type {
  FunctionValue,
  ObjectValue,
  PropertyKey,
} from '../value.mjs';
import type {
  List,
} from './spec-types.mjs';
*/

import {
  Type,
  Value,
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
} from './all.mjs';
import {
  ArrayCreate,
} from '../intrinsics/Array.mjs';

// 7.3.1 Get
export function Get(O /* : ObjectValue */, P /* : PropertyKey */) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  return O.Get(P, O);
}

// 7.3.2 GetV
export function GetV(V /* : Value */, P /* : PropertyKey */) {
  Assert(IsPropertyKey(P));
  const O = ToObject(V);
  return O.Get(V, P);
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
  return O.DefineOwnProperty(P, newDesc);
}

// 7.3.6 CreateDataPropertyOrThrow
export function CreateDataPropertyOrThrow(O /* : ObjectValue */, P /* : PropertyKey */, V /* : Value */) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const success = CreateDataProperty(O, P, V);
  if (success === false) {
    surroundingAgent.Throw('TypeError');
  }
  return success;
}

// 7.3.9 GetMethod
export function GetMethod(V /* : Value */, P /* : PropertyKey */) {
  Assert(IsPropertyKey(P));
  const func = GetV(V, P);
  if (func.isNull() || func.isUndefined()) {
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
  return O.HasProperty(P);
}

// 7.3.11 HasOwnProperty
export function HasOwnProperty(O /* : ObjectValue */, P /* : PropertyKey */) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const desc = O.GetOwnProperty(P);
  if (desc.isUndefined()) {
    return false;
  }
  return true;
}

// 7.3.12 Call
export function Call(F /* : FunctionValue */, V /* : Value */, argumentsList /* : List<Value> */) {
  if (!argumentsList) {
    argumentsList = [];
  }

  if (IsCallable(F) === false) {
    surroundingAgent.Throw('TypeError');
  }

  return F.Call(V, argumentsList);
}

// 7.3.13 Construct
export function Construct(F /* : FunctionValue */, argumentsList /* : List<Value> */, newTarget /* : FunctionValue */) {
  if (!newTarget) {
    newTarget = F;
  }
  if (!argumentsList) {
    argumentsList = [];
  }
  Assert(IsConstructor(F));
  Assert(IsConstructor(newTarget));
  return F.Construct(argumentsList, newTarget);
}

// 7.3.16 CreateArrayFromList
export function CreateArrayFromList(elements /* : List<Value> */) {
  Assert(elements.every((e) => e instanceof Value));
  const array = ArrayCreate(0);
  let n = 0;
  elements.forEach((e) => {
    const status = CreateDataProperty(array, ToString(n), e);
    Assert(status === true);
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
  const func = GetV(V, P);
  return Call(func, V, argumentsList);
}

// 7.3.22 GetFunctionRealm
export function GetFunctionRealm(obj /* : FunctionValue */) {
  Assert(IsCallable(obj));
  if ('Realm' in obj) {
    return obj.Realm;
  }

  /*
  if (IsBoundFunctionExoticObject(obj)) {
    const target = obj.BoundTargetFunction;
    return GetFunctionRealm(target);
  }
  */

  if (obj instanceof ProxyValue) {
    if (obj.ProxyHandler.isNull()) {
      surroundingAgent.Throw('TypeError');
      return;
    }
    const proxyTarget = obj.ProxyTarget;
    return GetFunctionRealm(proxyTarget);
  }

  return surroundingAgent.currentRealmRecord;
}
