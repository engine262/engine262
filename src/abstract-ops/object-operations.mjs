import {
  Type,
  Value,
  UndefinedValue,
  NullValue,
  ProxyValue,
  New as NewValue,
  wellKnownSymbols,
} from '../value';
import {
  surroundingAgent,
} from '../engine';
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
} from './all';
import {
  ArrayCreate,
} from '../intrinsics/Array';
import {
  Q, X,
} from '../completion';

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
  if (func instanceof NullValue || func instanceof UndefinedValue) {
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
  if (desc instanceof UndefinedValue) {
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

// #sec-speciesconstructor
export function SpeciesConstructor(O, defaultConstructor) {
  Assert(Type(O) === 'Object');
  const C = Q(Get(O, NewValue('constructor')));
  if (C instanceof UndefinedValue) {
    return defaultConstructor;
  }
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const S = Q(Get(C, wellKnownSymbols.species));
  if (S instanceof UndefinedValue || S instanceof NullValue) {
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
    if (obj.ProxyHandler instanceof NullValue) {
      return surroundingAgent.Throw('TypeError');
    }
    const proxyTarget = obj.ProxyTarget;
    return Q(GetFunctionRealm(proxyTarget));
  }

  return surroundingAgent.currentRealmRecord;
}
