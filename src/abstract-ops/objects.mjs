import {
  Descriptor,
  ObjectValue,
  SymbolValue, JSStringValue, UndefinedValue, NullValue,
  Value,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
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
  MakeBasicObject,
  isArrayIndex,
} from './all.mjs';

// 9.1.1.1 OrdinaryGetPrototypeOf
export function OrdinaryGetPrototypeOf(O) {
  return O.Prototype;
}

// 9.1.2.1 OrdinarySetPrototypeOf
export function OrdinarySetPrototypeOf(O, V) {
  Assert(V instanceof ObjectValue || V instanceof NullValue);

  const current = O.Prototype;
  if (SameValue(V, current) === Value.true) {
    return Value.true;
  }
  const extensible = O.Extensible;
  if (extensible === Value.false) {
    return Value.false;
  }
  let p = V;
  let done = false;
  while (done === false) {
    if (p === Value.null) {
      done = true;
    } else if (SameValue(p, O) === Value.true) {
      return Value.false;
    } else if (p.GetPrototypeOf !== ObjectValue.prototype.GetPrototypeOf) {
      done = true;
    } else {
      p = p.Prototype;
    }
  }
  O.Prototype = V;
  return Value.true;
}

// 9.1.3.1 OrdinaryIsExtensible
export function OrdinaryIsExtensible(O) {
  return O.Extensible;
}

// 9.1.4.1 OrdinaryPreventExtensions
export function OrdinaryPreventExtensions(O) {
  O.Extensible = Value.false;
  return Value.true;
}

// 9.1.5.1 OrdinaryGetOwnProperty
export function OrdinaryGetOwnProperty(O, P) {
  Assert(IsPropertyKey(P));

  if (!O.properties.has(P)) {
    return Value.undefined;
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

/** http://tc39.es/ecma262/#sec-iscompatiblepropertydescriptor */
export function IsCompatiblePropertyDescriptor(Extensible, Desc, Current) {
  return ValidateAndApplyPropertyDescriptor(Value.undefined, Value.undefined, Extensible, Desc, Current);
}

// 9.1.6.3 ValidateAndApplyPropertyDescriptor
export function ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current) {
  Assert(O === Value.undefined || IsPropertyKey(P));

  if (current === Value.undefined) {
    if (extensible === Value.false) {
      return Value.false;
    }

    Assert(extensible === Value.true);

    if (IsGenericDescriptor(Desc) || IsDataDescriptor(Desc)) {
      if (!(O instanceof UndefinedValue)) {
        O.properties.set(P, Descriptor({
          Value: Desc.Value === undefined ? Value.undefined : Desc.Value,
          Writable: Desc.Writable === undefined ? Value.false : Desc.Writable,
          Enumerable: Desc.Enumerable === undefined ? Value.false : Desc.Enumerable,
          Configurable: Desc.Configurable === undefined ? Value.false : Desc.Configurable,
        }));
      }
    } else {
      Assert(IsAccessorDescriptor(Desc));
      if (!(O instanceof UndefinedValue)) {
        O.properties.set(P, Descriptor({
          Get: Desc.Get === undefined ? Value.undefined : Desc.Get,
          Set: Desc.Set === undefined ? Value.undefined : Desc.Set,
          Enumerable: Desc.Enumerable === undefined ? Value.false : Desc.Enumerable,
          Configurable: Desc.Configurable === undefined ? Value.false : Desc.Configurable,
        }));
      }
    }

    return Value.true;
  }

  if (Desc.everyFieldIsAbsent()) {
    return Value.true;
  }

  if (current.Configurable === Value.false) {
    if (Desc.Configurable !== undefined && Desc.Configurable === Value.true) {
      return Value.false;
    }

    if (Desc.Enumerable !== undefined && Desc.Enumerable !== current.Enumerable) {
      return Value.false;
    }
  }

  if (IsGenericDescriptor(Desc)) {
    // No further validation is required.
  } else if (IsDataDescriptor(current) !== IsDataDescriptor(Desc)) {
    if (current.Configurable === Value.false) {
      return Value.false;
    }
    if (IsDataDescriptor(current)) {
      if (!(O instanceof UndefinedValue)) {
        const entry = O.properties.get(P);
        entry.Value = undefined;
        entry.Writable = undefined;
        entry.Get = Value.undefined;
        entry.Set = Value.undefined;
      }
    } else {
      if (!(O instanceof UndefinedValue)) {
        const entry = O.properties.get(P);
        entry.Get = undefined;
        entry.Set = undefined;
        entry.Value = Value.undefined;
        entry.Writable = Value.false;
      }
    }
  } else if (IsDataDescriptor(current) && IsDataDescriptor(Desc)) {
    if (current.Configurable === Value.false && current.Writable === Value.false) {
      if (Desc.Writable !== undefined && Desc.Writable === Value.true) {
        return Value.false;
      }
      if (Desc.Value !== undefined && SameValue(Desc.Value, current.Value) === Value.false) {
        return Value.false;
      }
      return Value.true;
    }
  } else {
    Assert(IsAccessorDescriptor(current) && IsAccessorDescriptor(Desc));
    if (current.Configurable === Value.false) {
      if (Desc.Set !== undefined && SameValue(Desc.Set, current.Set) === Value.false) {
        return Value.false;
      }
      if (Desc.Get !== undefined && SameValue(Desc.Get, current.Get) === Value.false) {
        return Value.false;
      }
      return Value.true;
    }
  }

  if (!(O instanceof UndefinedValue)) {
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

  return Value.true;
}

// 9.1.7.1 OrdinaryHasProperty
export function OrdinaryHasProperty(O, P) {
  Assert(IsPropertyKey(P));

  const hasOwn = Q(O.GetOwnProperty(P));
  if (!(hasOwn instanceof UndefinedValue)) {
    return Value.true;
  }
  const parent = Q(O.GetPrototypeOf());
  if (!(parent instanceof NullValue)) {
    return Q(parent.HasProperty(P));
  }
  return Value.false;
}

// 9.1.8.1
export function OrdinaryGet(O, P, Receiver) {
  Assert(IsPropertyKey(P));

  const desc = Q(O.GetOwnProperty(P));
  if (desc instanceof UndefinedValue) {
    const parent = Q(O.GetPrototypeOf());
    if (parent instanceof NullValue) {
      return Value.undefined;
    }
    return Q(parent.Get(P, Receiver));
  }
  if (IsDataDescriptor(desc)) {
    return desc.Value;
  }
  Assert(IsAccessorDescriptor(desc));
  const getter = desc.Get;
  if (getter instanceof UndefinedValue) {
    return Value.undefined;
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

  if (ownDesc instanceof UndefinedValue) {
    const parent = Q(O.GetPrototypeOf());
    if (!(parent instanceof NullValue)) {
      return Q(parent.Set(P, V, Receiver));
    }
    ownDesc = Descriptor({
      Value: Value.undefined,
      Writable: Value.true,
      Enumerable: Value.true,
      Configurable: Value.true,
    });
  }

  if (IsDataDescriptor(ownDesc)) {
    if (ownDesc.Writable !== undefined && ownDesc.Writable === Value.false) {
      return Value.false;
    }
    if (!(Receiver instanceof ObjectValue)) {
      return Value.false;
    }

    const existingDescriptor = Q(Receiver.GetOwnProperty(P));
    if (!(existingDescriptor instanceof UndefinedValue)) {
      if (IsAccessorDescriptor(existingDescriptor)) {
        return Value.false;
      }
      if (existingDescriptor.Writable === Value.false) {
        return Value.false;
      }
      const valueDesc = Descriptor({ Value: V });
      return Q(Receiver.DefineOwnProperty(P, valueDesc));
    }
    return CreateDataProperty(Receiver, P, V);
  }

  Assert(IsAccessorDescriptor(ownDesc));
  const setter = ownDesc.Set;
  if (setter === undefined || setter instanceof UndefinedValue) {
    return Value.false;
  }
  Q(Call(setter, Receiver, [V]));
  return Value.true;
}

// 9.1.10.1 OrdinaryDelete
export function OrdinaryDelete(O, P) {
  Assert(IsPropertyKey(P));
  const desc = Q(O.GetOwnProperty(P));
  if (desc instanceof UndefinedValue) {
    return Value.true;
  }
  if (desc.Configurable === Value.true) {
    O.properties.delete(P);
    return Value.true;
  }
  return Value.false;
}

// 9.1.11.1
export function OrdinaryOwnPropertyKeys(O) {
  const keys = [];

  // For each own property key P of O that is an array index, in ascending numeric index order, do
  //   Add P as the last element of keys.
  for (const P of O.properties.keys()) {
    if (isArrayIndex(P)) {
      keys.push(P);
    }
  }
  keys.sort((a, b) => Number.parseInt(a.stringValue(), 10) - Number.parseInt(b.stringValue(), 10));

  // For each own property key P of O such that Type(P) is String and
  // P is not an array index, in ascending chronological order of property creation, do
  //   Add P as the last element of keys.
  for (const P of O.properties.keys()) {
    if (P instanceof JSStringValue && isArrayIndex(P) === false) {
      keys.push(P);
    }
  }

  // For each own property key P of O such that Type(P) is Symbol,
  // in ascending chronological order of property creation, do
  //   Add P as the last element of keys.
  for (const P of O.properties.keys()) {
    if (P instanceof SymbolValue) {
      keys.push(P);
    }
  }

  return keys;
}

/** http://tc39.es/ecma262/#sec-ordinaryobjectcreate */
export function OrdinaryObjectCreate(proto, additionalInternalSlotsList) {
  // 1. Let internalSlotsList be « [[Prototype]], [[Extensible]] ».
  const internalSlotsList = ['Prototype', 'Extensible'];
  // 2. If additionalInternalSlotsList is present, append each of its elements to internalSlotsList.
  if (additionalInternalSlotsList !== undefined) {
    internalSlotsList.push(...additionalInternalSlotsList);
  }
  // 3. Let O be ! MakeBasicObject(internalSlotsList).
  const O = X(MakeBasicObject(internalSlotsList));
  // 4. Set O.[[Prototype]] to proto.
  O.Prototype = proto;
  // 5. Return O.
  return O;
}

// 9.1.13 OrdinaryCreateFromConstructor
export function OrdinaryCreateFromConstructor(constructor, intrinsicDefaultProto, internalSlotsList) {
  // Assert: intrinsicDefaultProto is a String value that is this specification's name of an intrinsic object.
  const proto = Q(GetPrototypeFromConstructor(constructor, intrinsicDefaultProto));
  return OrdinaryObjectCreate(proto, internalSlotsList);
}

// 9.1.14 GetPrototypeFromConstructor
export function GetPrototypeFromConstructor(constructor, intrinsicDefaultProto) {
  // Assert: intrinsicDefaultProto is a String value that
  // is this specification's name of an intrinsic object.
  Assert(IsCallable(constructor) === Value.true);
  let proto = Q(Get(constructor, new Value('prototype')));
  if (!(proto instanceof ObjectValue)) {
    const realm = Q(GetFunctionRealm(constructor));
    proto = realm.Intrinsics[intrinsicDefaultProto];
  }
  return proto;
}
