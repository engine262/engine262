import {
  Value,
  ObjectValue,
  Type,
  Descriptor,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  Call,
  CreateDataProperty,
  Get,
  GetFunctionRealm,
  IsAccessorDescriptor,
  IsCallable,
  IsDataDescriptor,
  IsExtensible,
  IsGenericDescriptor,
  IsPropertyKey,
  SameValue,
} from './all.mjs';
import {
  InstanceofOperator,
} from '../runtime-semantics/all.mjs';
import { Q } from '../completion.mjs';

// 9.1.1.1 OrdinaryGetPrototypeOf
export function OrdinaryGetPrototypeOf(O) {
  return O.Prototype;
}

// 9.1.2.1 OrdinarySetPrototypeOf
export function OrdinarySetPrototypeOf(O, V) {
  Assert(Type(V) === 'Object' || Type(V) === 'Null');

  const extensible = O.Extensible;
  const current = O.Prototype;
  if (SameValue(V, current) === true) {
    return new Value(true);
  }
  if (extensible === false) {
    return new Value(false);
  }
  let p = V;
  let done = false;
  while (done === false) {
    if (Type(p) === 'Null') {
      done = true;
    } else if (SameValue(p, O) === true) {
      return false;
    } else if (p.GetPrototypeOf !== ObjectValue.prototype.GetPrototypeOf) {
      done = true;
    } else {
      p = p.Prototype;
    }
  }
  O.Prototype = V;
  return true;
}

// 9.1.3.1 OrdinaryIsExtensible
export function OrdinaryIsExtensible(O) {
  return new Value(O.Extensible);
}

// 9.1.4.1 OrdinaryPreventExtensions
export function OrdinaryPreventExtensions(O) {
  O.Extensible = false;
  return new Value(true);
}

// 9.1.5.1 OrdinaryGetOwnProperty
export function OrdinaryGetOwnProperty(O, P) {
  Assert(IsPropertyKey(P));

  if (!O.properties.has(P)) {
    return new Value(undefined);
  }

  const D = Descriptor({});

  const x = O.properties.get(P);

  if (IsDataDescriptor(x)) {
    D.Value = x.Value;
    D.Writable = x.Writable;
  } else if (IsAccessorDescriptor(x)) {
    D.Get = x.Get;
    D.Set = x.Set;
  }
  D.Enumerable = x.Enumerable;
  D.Configurable = x.Configurable;

  return D;
}

// 9.1.6.1 OrdinaryDefineOwnProperty
export function OrdinaryDefineOwnProperty(O, P, Desc) {
  const current = Q(O.GetOwnProperty(P));
  const extensible = Q(IsExtensible(O));
  return ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current);
}

// 9.1.6.3 ValidateAndApplyPropertyDescriptor
export function ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current) {
  Assert(Type(O) === 'Undefined' || IsPropertyKey(P));

  if (Type(current) === 'Undefined') {
    if (extensible.isFalse()) {
      return new Value(false);
    }

    Assert(extensible.isTrue());

    if (IsGenericDescriptor(Desc) || IsDataDescriptor(Desc)) {
      if (Type(O) !== 'Undefined') {
        O.properties.set(P, Descriptor({
          Value: Desc.Value === undefined ? new Value(undefined) : Desc.Value,
          Writable: Desc.Writable === undefined ? new Value(false) : Desc.Writable,
          Enumerable: Desc.Enumerable === undefined ? new Value(false) : Desc.Enumerable,
          Configurable: Desc.Configurable === undefined ? new Value(false) : Desc.Configurable,
        }));
      }
    } else {
      Assert(IsAccessorDescriptor(Desc));
      if (Type(O) !== 'Undefined') {
        O.properties.set(P, Descriptor({
          Get: Desc.Get === undefined ? new Value(undefined) : Desc.Get,
          Set: Desc.Set === undefined ? new Value(undefined) : Desc.Set,
          Enumerable: Desc.Enumerable === undefined ? new Value(false) : Desc.Enumerable,
          Configurable: Desc.Configurable === undefined ? new Value(false) : Desc.Configurable,
        }));
      }
    }

    return new Value(true);
  }

  if (Desc.everyFieldIsAbsent()) {
    return new Value(true);
  }

  if (current.Configurable.isFalse()) {
    if (Desc.Configurable !== undefined && Desc.Configurable.isTrue()) {
      return new Value(false);
    }

    if (Desc.Enumerable !== undefined && Desc.Enumerable !== current.Enumerable) {
      return new Value(false);
    }
  }

  if (IsGenericDescriptor(Desc)) {
    // No further validation is required.
  } else if (IsDataDescriptor(current) !== IsDataDescriptor(Desc)) {
    if (current.Configurable.isFalse()) {
      return new Value(false);
    }
    if (IsDataDescriptor(current)) {
      if (Type(O) !== 'Undefined') {
        const entry = O.properties.get(P);
        entry.Value = undefined;
        entry.Writable = undefined;
        entry.Get = new Value(undefined);
        entry.Set = new Value(undefined);
      }
    } else {
      if (Type(O) !== 'Undefined') {
        const entry = O.properties.get(P);
        entry.Get = undefined;
        entry.Set = undefined;
        entry.Value = new Value(undefined);
        entry.Writable = new Value(false);
      }
    }
  } else if (IsDataDescriptor(current) && IsDataDescriptor(Desc)) {
    if (current.Configurable.isFalse() && current.Writable.isFalse()) {
      if (Desc.Writable !== undefined && Desc.Writable.isTrue()) {
        return new Value(false);
      }
      if (Desc.Value !== undefined && SameValue(Desc.Value, current.Value) === false) {
        return new Value(false);
      }
      return new Value(true);
    }
  } else {
    Assert(IsAccessorDescriptor(current) && IsAccessorDescriptor(Desc));
    if (current.Configurable.isFalse()) {
      if (Desc.Set !== undefined && SameValue(Desc.Set, current.Set) === false) {
        return new Value(false);
      }
      if (Desc.Get !== undefined && SameValue(Desc.Get, current.Get) === false) {
        return new Value(false);
      }
      return new Value(true);
    }
  }

  if (Type(O) !== 'Undefined') {
    const target = O.properties.get(P);
    if (Desc.Value !== undefined) {
      target.Value = Desc.Value;
    }
    if (Desc.Writable !== undefined) {
      target.Writable = Desc.Writable;
    }
    if (Desc.Get !== undefined) {
      target.Get = Desc.Get;
    }
    if (Desc.Set !== undefined) {
      target.Set = Desc.Set;
    }
    if (Desc.Enumerable !== undefined) {
      target.Enumerable = Desc.Enumerable;
    }
    if (Desc.Configurable !== undefined) {
      target.Configurable = Desc.Configurable;
    }
  }

  return new Value(true);
}

// 9.1.7.1 OrdinaryHasProperty
export function OrdinaryHasProperty(O, P) {
  Assert(IsPropertyKey(P));

  const hasOwn = Q(O.GetOwnProperty(P));
  if (Type(hasOwn) !== 'Undefined') {
    return new Value(true);
  }
  const parent = Q(O.GetPrototypeOf());
  if (Type(parent) !== 'Null') {
    return Q(parent.HasProperty(P));
  }
  return new Value(false);
}

// 9.1.8.1
export function OrdinaryGet(O, P, Receiver) {
  Assert(IsPropertyKey(P));

  const desc = Q(O.GetOwnProperty(P));
  if (Type(desc) === 'Undefined') {
    const parent = Q(O.GetPrototypeOf());
    if (Type(parent) === 'Null') {
      return new Value(undefined);
    }
    return Q(parent.Get(P, Receiver));
  }
  if (IsDataDescriptor(desc)) {
    return desc.Value;
  }
  Assert(IsAccessorDescriptor(desc));
  const getter = desc.Get;
  if (Type(getter) === 'Undefined') {
    return new Value(undefined);
  }
  return Q(Call(getter, Receiver));
}

// 9.1.9.1 OrdinarySet
export function OrdinarySet(O, P, V, Receiver) {
  Assert(IsPropertyKey(P));
  const ownDesc = Q(O.GetOwnProperty(P));
  return OrdinarySetWithOwnDescriptor(O, P, V, Receiver, ownDesc);
}

// 9.1.9.2 OrdinarySetWithOwnDescriptor
export function OrdinarySetWithOwnDescriptor(O, P, V, Receiver, ownDesc) {
  Assert(IsPropertyKey(P));

  if (Type(ownDesc) === 'Undefined') {
    const parent = Q(O.GetPrototypeOf());
    if (Type(parent) !== 'Null') {
      return Q(parent.Set(P, V, Receiver));
    }
    ownDesc = Descriptor({
      Value: new Value(undefined),
      Writable: new Value(true),
      Enumerable: new Value(true),
      Configurable: new Value(true),
    });
  }

  if (IsDataDescriptor(ownDesc)) {
    if (ownDesc.Writable !== undefined && ownDesc.Writable.isFalse()) {
      return new Value(false);
    }
    if (Type(Receiver) !== 'Object') {
      return new Value(false);
    }

    const existingDescriptor = Q(Receiver.GetOwnProperty(P));
    if (Type(existingDescriptor) !== 'Undefined') {
      if (IsAccessorDescriptor(existingDescriptor)) {
        return new Value(false);
      }
      if (existingDescriptor.Writable.isFalse()) {
        return new Value(false);
      }
      const valueDesc = Descriptor({ Value: V });
      return Q(Receiver.DefineOwnProperty(P, valueDesc));
    }
    return CreateDataProperty(Receiver, P, V);
  }

  Assert(IsAccessorDescriptor(ownDesc));
  const setter = ownDesc.Set;
  if (setter === undefined || Type(setter) === 'Undefined') {
    return new Value(false);
  }
  Q(Call(setter, Receiver, [V]));
  return new Value(true);
}

// 9.1.10.1 OrdinaryDelete
export function OrdinaryDelete(O, P) {
  Assert(IsPropertyKey(P));
  const desc = Q(O.GetOwnProperty(P));
  if (Type(desc) === 'Undefined') {
    return new Value(true);
  }
  if (desc.Configurable.isTrue()) {
    O.properties.delete(P);
    return new Value(true);
  }
  return new Value(false);
}

// 9.1.11.1
export function OrdinaryOwnPropertyKeys(O) {
  const keys = [];

  const integerIndexes = [];
  const strings = [];
  const symbols = [];
  for (const key of O.properties.keys()) {
    if (Type(key) === 'String') {
      const int = Number.parseInt(key.stringValue(), 10);
      if (int > 0 && int < (2 ** 53) - 1) {
        integerIndexes.push(key);
      } else {
        strings.push(key);
      }
    } else if (Type(key) === 'Symbol') {
      symbols.push(key);
    }
  }

  integerIndexes.forEach((P) => {
    keys.push(P);
  });

  strings.forEach((P) => {
    keys.push(P);
  });

  symbols.forEach((P) => {
    keys.push(P);
  });

  return keys;
}

// 9.1.12 ObjectCreate
export function ObjectCreate(proto, internalSlotsList) {
  Assert(Type(proto) === 'Null' || Type(proto) === 'Object');
  if (!internalSlotsList) {
    internalSlotsList = [];
  }

  const obj = new ObjectValue();
  for (const slot of internalSlotsList) {
    obj[slot] = new Value(undefined);
  }

  // The following steps happen in ObjectValue constructor:
  //
  // Set obj's essential internal methods to the default ordinary
  // object definitions specified in 9.1.

  obj.Prototype = proto;
  obj.Extensible = true;

  return obj;
}

// 9.1.13 OrdinaryCreateFromConstructor
export function OrdinaryCreateFromConstructor(
  constructor,
  intrinsicDefaultProto,
  internalSlotsList,
) {
  // Assert: intrinsicDefaultProto is a String value that
  // is this specification's name of an intrinsic object.
  const proto = Q(GetPrototypeFromConstructor(constructor, intrinsicDefaultProto));
  return ObjectCreate(proto, internalSlotsList);
}

// 9.1.14 GetPrototypeFromConstructor
export function GetPrototypeFromConstructor(
  constructor, intrinsicDefaultProto,
) {
  // Assert: intrinsicDefaultProto is a String value that
  // is this specification's name of an intrinsic object.
  Assert(IsCallable(constructor).isTrue());
  let proto = Q(Get(constructor, new Value('prototype')));
  if (Type(proto) !== 'Object') {
    const realm = Q(GetFunctionRealm(constructor));
    proto = realm.Intrinsics[intrinsicDefaultProto];
  }
  return proto;
}

// #sec-OrdinaryHasInstance
export function OrdinaryHasInstance(C, O) {
  if (IsCallable(C).isFalse()) {
    return new Value(false);
  }
  if ('BoundTargetFunction' in C) {
    const BC = C.BoundTargetFunction;
    return Q(InstanceofOperator(O, BC));
  }
  if (Type(O) !== 'Object') {
    return new Value(false);
  }
  const P = Q(Get(C, new Value('prototype')));
  if (Type(P) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  while (true) {
    O = Q(O.GetPrototypeOf());
    if (Type(O) === 'Null') {
      return new Value(false);
    }
    if (SameValue(P, O)) {
      return new Value(true);
    }
  }
}
