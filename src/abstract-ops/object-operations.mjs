import {
  Type,
  Value,
  ProxyValue,
  New as NewValue,
  wellKnownSymbols,
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
  SameValue,
  ToLength,
} from './all.mjs';
import {
  ArrayCreate,
} from '../intrinsics/Array.mjs';
import {
  Q, X,
} from '../completion.mjs';

// #sec-get-o-p Get
export function Get(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  return Q(O.Get(P, O));
}

// #sec-getv GetV
export function GetV(V, P) {
  Assert(IsPropertyKey(P));
  const O = ToObject(V);
  return Q(O.Get(V, P));
}

// #sec-set-o-p-v-throw Set
export function Set(
  O,
  P,
  V,
  Throw,
) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  Assert(Type(Throw) === 'Boolean');
  const success = Q(O.Set(P, V, O));
  if (success.isFalse() && Throw.isTrue()) {
    return surroundingAgent.Throw('TypeError');
  }
  return success;
}

// 7.3.4 CreateDataProperty
export function CreateDataProperty(O, P, V) {
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
  O, P, V,
) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const success = Q(CreateDataProperty(O, P, V));
  if (success.isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return success;
}

// #sec-definepropertyorthrow DefinePropertyOrThrow
export function DefinePropertyOrThrow(
  O,
  P,
  desc,
) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const success = Q(O.DefineOwnProperty(P, desc));
  if (success.isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return success;
}

// #sec-deletepropertyorthrow
export function DeletePropertyOrThrow(
  O,
  P,
) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const success = Q(O.Delete(P));
  if (success.isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return success;
}

// 7.3.9 GetMethod
export function GetMethod(
  V,
  P,
) {
  Assert(IsPropertyKey(P));
  const func = Q(GetV(V, P));
  if (Type(func) === 'Null' || Type(func) === 'Undefined') {
    return NewValue(undefined);
  }
  if (IsCallable(func) === false) {
    return surroundingAgent.Throw('TypeError');
  }
  return func;
}

// 7.3.10 HasProperty
export function HasProperty(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  return Q(O.HasProperty(P));
}

// 7.3.11 HasOwnProperty
export function HasOwnProperty(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const desc = Q(O.GetOwnProperty(P));
  if (Type(desc) === 'Undefined') {
    return NewValue(false);
  }
  return NewValue(true);
}

// 7.3.12 Call
export function Call(F, V, argumentsList) {
  if (!argumentsList) {
    argumentsList = [];
  }

  if (IsCallable(F) === false) {
    return surroundingAgent.Throw('TypeError');
  }

  return Q(F.Call(V, argumentsList));
}

// 7.3.13 Construct
export function Construct(
  F,
  argumentsList,
  newTarget,
) {
  if (!newTarget) {
    newTarget = F;
  }
  if (!argumentsList) {
    argumentsList = [];
  }
  Assert(IsConstructor(F).isTrue());
  Assert(IsConstructor(newTarget).isTrue());
  return Q(F.Construct(argumentsList, newTarget));
}

// #sec-setintegritylevel SetIntegrityLevel
export function SetIntegrityLevel(O, level) {
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
      if (Type(currentDesc) !== 'Undefined') {
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
  return NewValue(true);
}

// #sec-testintegritylevel TestIntegrityLevel
export function TestIntegrityLevel(O, level) {
  Assert(Type(O) === 'Object');
  Assert(level === 'sealed' || level === 'frozen');
  const status = Q(IsExtensible(O));
  if (status.isTrue()) {
    return NewValue(false);
  }
  const keys = Q(O.OwnPropertyKeys());
  for (const k of keys) {
    const currentDesc = Q(O.GetOwnProperty(k));
    if (Type(currentDesc) !== 'Undefined') {
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
export function CreateArrayFromList(elements) {
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
export function Invoke(V, P, argumentsList) {
  Assert(IsPropertyKey(P));
  if (!argumentsList) {
    argumentsList = [];
  }
  const func = Q(GetV(V, P));
  return Q(Call(func, V, argumentsList));
}


// #sec-enumerableownpropertynames EnumerableOwnPropertyNames
export function EnumerableOwnPropertyNames(
  O,
  kind,
) {
  Assert(Type(O) === 'Object');
  const ownKeys = Q(O.OwnPropertyKeys());
  const properties = [];
  ownKeys.forEach((key) => {
    if (Type(key) === 'String') {
      const desc = Q(O.GetOwnProperty(key));
      if (Type(desc) !== 'Undefined' && desc.Enumerable === true) {
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

// #sec-speciesconstructor
export function SpeciesConstructor(O, defaultConstructor) {
  Assert(Type(O) === 'Object');
  const C = Q(Get(O, NewValue('constructor')));
  if (Type(C) === 'Undefined') {
    return defaultConstructor;
  }
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const S = Q(Get(C, wellKnownSymbols.species));
  if (Type(S) === 'Undefined' || Type(S) === 'Null') {
    return defaultConstructor;
  }
  if (IsConstructor(S).isTrue()) {
    return S;
  }
  return surroundingAgent.Throw('TypeError');
}

// 7.3.22 GetFunctionRealm
export function GetFunctionRealm(obj) {
  Assert(IsCallable(obj).isTrue());
  if ('Realm' in obj) {
    return obj.Realm;
  }

  if (obj instanceof ProxyValue) {
    if (Type(obj.ProxyHandler) === 'Null') {
      return surroundingAgent.Throw('TypeError');
    }
    const proxyTarget = obj.ProxyTarget;
    return Q(GetFunctionRealm(proxyTarget));
  }

  return surroundingAgent.currentRealmRecord;
}

// #sec-copydataproperties
export function CopyDataProperties(target, source, excludedItems) {
  Assert(Type(target) === 'Object');
  Assert(excludedItems.every((i) => IsPropertyKey(i)));
  if (Type(source) === 'Undefined' || Type(source) === 'Null') {
    return target;
  }
  const from = X(ToObject(source));
  const keys = from.OwnPropertyKeys();
  for (const nextKey of keys) {
    let excluded = false;
    for (const e of excludedItems) {
      if (SameValue(e, nextKey).isTrue()) {
        excluded = true;
      }
    }
    if (excluded === false) {
      const desc = Q(from.GetOwnProperty(nextKey));
      if (Type(desc) !== 'Undefined' && desc.Enumerable === true) {
        const propValue = Q(Get(from, nextKey));
        X(CreateDataProperty(target, nextKey, propValue));
      }
    }
  }
  return target;
}

// #sec-CreateListFromArrayLike
export function CreateListFromArrayLike(obj, elementTypes) {
  if (elementTypes === undefined) {
    elementTypes = ['Undefined', 'Null', 'Boolean', 'String', 'Symbol', 'Number', 'Object'];
  }
  if (Type(obj) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const len = Q(ToLength(Q(Get(obj, NewValue('length')))));
  const list = [];
  let index = 0;
  while (index < len.numberValue()) {
    const indexName = X(ToString(NewValue(index)));
    const next = Q(Get(obj, indexName));
    if (!elementTypes.includes(Type(next))) {
      return surroundingAgent.Throw('TypeError');
    }
    list.push(next);
    index += 1;
  }
  return list;
}
