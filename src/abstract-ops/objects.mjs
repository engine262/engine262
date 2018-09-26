import {
  New as NewValue,
  ObjectValue,
  Type,
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
    return NewValue(true);
  }
  if (extensible === false) {
    return NewValue(false);
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
  return NewValue(O.Extensible);
}

// 9.1.4.1 OrdinaryPreventExtensions
export function OrdinaryPreventExtensions(O) {
  O.Extensible = false;
  return NewValue(true);
}

// 9.1.5.1 OrdinaryGetOwnProperty
export function OrdinaryGetOwnProperty(O, P) {
  Assert(IsPropertyKey(P));

  if (!O.properties.has(P)) {
    return NewValue(undefined);
  }

  const D = {};

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
export function ValidateAndApplyPropertyDescriptor(
  O,
  P,
  extensible,
  Desc,
  current,
) {
  Assert(Type(O) === 'Undefined' || IsPropertyKey(P));

  if (Type(current) === 'Undefined') {
    if (extensible.isFalse()) {
      return NewValue(false);
    }

    Assert(extensible.isTrue());

    if (IsGenericDescriptor(Desc) || IsDataDescriptor(Desc)) {
      if (Type(O) !== 'Undefined') {
        O.properties.set(P, {
          Value: 'Value' in Desc ? Desc.Value : NewValue(undefined),
          Writable: 'Writable' in Desc ? Desc.Writable : false,
          Enumerable: 'Enumerable' in Desc ? Desc.Enumerable : false,
          Configurable: 'Configurable' in Desc ? Desc.Configurable : false,
        });
      }
    } else {
      Assert(IsAccessorDescriptor(Desc));
      if (Type(O) !== 'Undefined') {
        O.properties.set(P, {
          Get: 'Get' in Desc ? Desc.Get : NewValue(undefined),
          Set: 'Set' in Desc ? Desc.Set : NewValue(undefined),
          Enumerable: 'Enumerable' in Desc ? Desc.Enumerable : false,
          Configurable: 'Configurable' in Desc ? Desc.Configurable : false,
        });
      }
    }

    return NewValue(true);
  }

  if (Object.keys(Desc).length === 0) {
    return NewValue(true);
  }

  if (current.Configurable === false) {
    if (Desc.Configurable === true) {
      return NewValue(false);
    }

    if ('Enumerable' in Desc && Desc.Enumerable !== current.Enumerable) {
      return NewValue(false);
    }
  }

  if (IsGenericDescriptor(Desc)) {
    // No further validation is required.
  } else if (IsDataDescriptor(current) !== IsDataDescriptor(Desc)) {
    if (current.Configurable === false) {
      return NewValue(false);
    }
    if (IsDataDescriptor(current)) {
      if (Type(O) !== 'Undefined') {
        const entry = O.properties.get(P);
        delete entry.Value;
        delete entry.Writable;
        entry.Get = NewValue(undefined);
        entry.Set = NewValue(undefined);
      }
    } else {
      if (Type(O) !== 'Undefined') {
        const entry = O.properties.get(P);
        delete entry.Get;
        delete entry.Set;
        entry.Value = NewValue(undefined);
        entry.Writable = false;
      }
    }
  } else if (IsDataDescriptor(current) && IsDataDescriptor(Desc)) {
    if (current.Configurable === false && current.Writable === false) {
      if ('Writable' in Desc && Desc.Writable === true) {
        return NewValue(false);
      }
      if ('Value' in Desc && SameValue(Desc.Value, current.Value) === false) {
        return NewValue(false);
      }
      return NewValue(true);
    }
  } else {
    Assert(IsAccessorDescriptor(current) && IsAccessorDescriptor(Desc));
    if (current.Configurable === false) {
      if ('Set' in Desc && SameValue(Desc.Set, current.Set) === false) {
        return NewValue(false);
      }
      if ('Get' in Desc && SameValue(Desc.Get, current.Get) === false) {
        return NewValue(false);
      }
      return NewValue(true);
    }
  }

  if (Type(O) !== 'Undefined') {
    O.properties.set(P, current);
    Object.keys(Desc).forEach((field) => {
      current[field] = Desc[field];
    });
  }

  return NewValue(true);
}

// 9.1.7.1 OrdinaryHasProperty
export function OrdinaryHasProperty(O, P) {
  Assert(IsPropertyKey(P));

  const hasOwn = Q(O.GetOwnProperty(P));
  if (Type(hasOwn) !== 'Undefined') {
    return NewValue(true);
  }
  const parent = Q(O.GetPrototypeOf());
  if (Type(parent) !== 'Null') {
    return Q(parent.HasProperty(P));
  }
  return NewValue(false);
}

// 9.1.8.1
export function OrdinaryGet(O, P, Receiver) {
  Assert(IsPropertyKey(P));

  const desc = Q(O.GetOwnProperty(P));
  if (Type(desc) === 'Undefined') {
    const parent = Q(O.GetPrototypeOf());
    if (Type(parent) === 'Null') {
      return NewValue(undefined);
    }
    return Q(parent.Get(P, Receiver));
  }
  if (IsDataDescriptor(desc)) {
    return desc.Value;
  }
  Assert(IsAccessorDescriptor(desc));
  const getter = desc.Get;
  if (Type(getter) === 'Undefined') {
    return NewValue(undefined);
  }
  return Q(Call(getter, Receiver));
}

// 9.1.9.1 OrdinarySet
export function OrdinarySet(
  O,
  P,
  V,
  Receiver,
) {
  Assert(IsPropertyKey(P));
  const ownDesc = Q(O.GetOwnProperty(P));
  return OrdinarySetWithOwnDescriptor(O, P, V, Receiver, ownDesc);
}

// 9.1.9.2 OrdinarySetWithOwnDescriptor
export function OrdinarySetWithOwnDescriptor(
  O,
  P,
  V,
  Receiver,
  ownDesc,
) {
  Assert(IsPropertyKey(P));

  if (Type(ownDesc) === 'Undefined') {
    const parent = Q(O.GetPrototypeOf());
    if (Type(parent) !== 'Null') {
      return Q(parent.Set(P, V, Receiver));
    }
    ownDesc = {
      Value: NewValue(undefined),
      Writable: true,
      Enumerable: true,
      Configurable: true,
    };
  }

  if (IsDataDescriptor(ownDesc)) {
    if (ownDesc.Writable === false) {
      return NewValue(false);
    }
    if (Type(Receiver) !== 'Object') {
      return NewValue(false);
    }

    const existingDescriptor = Q(Receiver.GetOwnProperty(P));
    if (Type(existingDescriptor) !== 'Undefined') {
      if (IsAccessorDescriptor(existingDescriptor)) {
        return NewValue(false);
      }
      if (existingDescriptor.Writable === false) {
        return NewValue(false);
      }
      const valueDesc = { Value: V };
      return Q(Receiver.DefineOwnProperty(P, valueDesc));
    }
    return CreateDataProperty(Receiver, P, V);
  }

  Assert(IsAccessorDescriptor(ownDesc));
  const setter = ownDesc.Set;
  if (!setter || Type(setter) === 'Undefined') {
    return NewValue(false);
  }
  Q(Call(setter, Receiver, [V]));
  return NewValue(true);
}

// 9.1.10.1 OrdinaryDelete
export function OrdinaryDelete(O, P) {
  Assert(IsPropertyKey(P));
  const desc = Q(O.GetOwnProperty(P));
  if (Type(desc) === 'Undefined') {
    return NewValue(true);
  }
  if (desc.Configurable === true) {
    O.properties.delete(P);
    return NewValue(true);
  }
  return NewValue(false);
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
export function ObjectCreate(
  proto,
  internalSlotsList,
) {
  if (!internalSlotsList) {
    internalSlotsList = [];
  }

  const obj = new ObjectValue();

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
  let proto = Q(Get(constructor, NewValue('prototype')));
  if (Type(proto) !== 'Object') {
    const realm = Q(GetFunctionRealm(constructor));
    proto = realm.Intrinsics[intrinsicDefaultProto];
  }
  return proto;
}

// #sec-OrdinaryHasInstance
export function OrdinaryHasInstance(C, O) {
  if (IsCallable(C).isFalse()) {
    return NewValue(false);
  }
  if ('BoundTargetFunction' in C) {
    const BC = C.BoundTargetFunction;
    return Q(InstanceofOperator(O, BC));
  }
  if (Type(O) !== 'Object') {
    return NewValue(false);
  }
  const P = Q(Get(C, NewValue('prototype')));
  if (Type(P) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  while (true) {
    O = Q(O.GetPrototypeOf());
    if (Type(O) === 'Null') {
      return NewValue(false);
    }
    if (SameValue(P, O)) {
      return NewValue(true);
    }
  }
}
