/* @flow */

/* ::
import type {
  BooleanValue,
  PropertyKey,
  Value,
  FunctionValue,
  BuiltinFunctionValue,
  BuiltinFunctionCallback,
  ArrayValue,
} from '../value.mjs';
import type {
  PropertyDescriptor,
  List,
} from './spec-types.mjs';
import type {
  Realm,
} from '../realm.mjs';
*/

import {
  Type,
  New as NewValue,
  NullValue,
  ObjectValue,
  UndefinedValue,
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
  IsDataDescriptor,
  IsGenericDescriptor,
  IsCallable,
  IsExtensible,
  IsPropertyKey,
  SameValue,
  ToNumber,
  ToString,
  ToUint32,
} from './all.mjs';
import { Q, X } from '../completion.mjs';

// 9.1.1.1 OrdinaryGetPrototypeOf
export function OrdinaryGetPrototypeOf(O /* : ObjectValue */) {
  return O.Prototype;
}

// 9.1.2.1 OrdinarySetPrototypeOf
export function OrdinarySetPrototypeOf(O /* : ObjectValue */, V /* : ObjectValue | NullValue */) {
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
    if (p instanceof NullValue) {
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
export function OrdinaryIsExtensible(O /* : ObjectValue */) {
  return NewValue(O.Extensible);
}

// 9.1.4.1 OrdinaryPreventExtensions
export function OrdinaryPreventExtensions(O /* : ObjectValue */) {
  O.Extensible = false;
  return NewValue(true);
}

// 9.1.5.1 OrdinaryGetOwnProperty
export function OrdinaryGetOwnProperty(O /* : ObjectValue */, P /* : PropertyKey */) {
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
export function OrdinaryDefineOwnProperty(
  O /* : ObjectValue */,
  P /* : PropertyKey */,
  Desc /* : PropertyDescriptor */,
) {
  const current = Q(O.GetOwnProperty(P));
  const extensible = Q(IsExtensible(O));
  return ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current);
}

// 9.1.6.3 ValidateAndApplyPropertyDescriptor
export function ValidateAndApplyPropertyDescriptor(
  O /* : UndefinedValue | ObjectValue */,
  P /* : UndefinedValue | PropertyKey */,
  extensible /* : BooleanValue */,
  Desc /* : PropertyDescriptor */,
  current /* : PropertyDescriptor */,
) /* : BooleanValue */ {
  Assert(O instanceof UndefinedValue || IsPropertyKey(P));

  if (current instanceof UndefinedValue) {
    if (extensible.isFalse()) {
      return NewValue(false);
    }

    Assert(extensible.isTrue());

    if (IsGenericDescriptor(Desc) || IsDataDescriptor(Desc)) {
      if (!(O instanceof UndefinedValue)) {
        O.properties.set(P, {
          Value: 'Value' in Desc ? Desc.Value : NewValue(undefined),
          Writable: 'Writable' in Desc ? Desc.Writable : false,
          Enumerable: 'Enumerable' in Desc ? Desc.Enumerable : false,
          Configurable: 'Configurable' in Desc ? Desc.Configurable : false,
        });
      }
    } else {
      Assert(IsAccessorDescriptor(Desc));
      if (!(O instanceof UndefinedValue)) {
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
      if (!(O instanceof UndefinedValue)) {
        const entry = O.properties.get(P);
        delete entry.Value;
        delete entry.Writable;
        entry.Get = NewValue(undefined);
        entry.Set = NewValue(undefined);
      }
    } else {
      if (!(O instanceof UndefinedValue)) {
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
      if ('Get' in Desc && SameValue(Desc.Get, current.Get)) {
        return NewValue(false);
      }
      return NewValue(true);
    }
  }

  if (!(O instanceof UndefinedValue)) {
    O.properties.set(P, current);
    Object.keys(Desc).forEach((field) => {
      current[field] = Desc[field];
    });
  }

  return NewValue(true);
}

// 9.1.7.1 OrdinaryHasProperty
export function OrdinaryHasProperty(O /* : ObjectValue */, P /* : PropertyKey */) {
  Assert(IsPropertyKey(P));

  const hasOwn = Q(O.GetOwnProperty(P));
  if (!(hasOwn instanceof UndefinedValue)) {
    return NewValue(true);
  }
  const parent = Q(O.GetPrototypeOf());
  if (!parent.isNull()) {
    return Q(parent.HasOwnProperty(P));
  }
  return NewValue(false);
}

// 9.1.8.1
export function OrdinaryGet(O /* : ObjectValue */, P /* : PropertyKey */, Receiver /* : Value */) {
  Assert(IsPropertyKey(P));

  const desc = Q(O.GetOwnProperty(P));
  if (desc instanceof UndefinedValue) {
    const parent = Q(O.GetPrototypeOf());
    if (parent instanceof NullValue) {
      return NewValue(undefined);
    }
    return Q(parent.Get(P, Receiver));
  }
  if (IsDataDescriptor(desc)) {
    return desc.Value;
  }
  Assert(IsAccessorDescriptor(desc));
  const getter = desc.Get;
  if (getter instanceof UndefinedValue) {
    return NewValue(undefined);
  }
  return Q(Call(getter, Receiver));
}

// 9.1.9.1 OrdinarySet
export function OrdinarySet(
  O /* : ObjectValue */,
  P /* : PropertyKey */,
  V /* : Value */,
  Receiver /* : Value */,
) {
  Assert(IsPropertyKey(P));
  const ownDesc = Q(O.GetOwnProperty(P));
  return OrdinarySetWithOwnDescriptor(O, P, V, Receiver, ownDesc);
}

// 9.1.9.2 OrdinarySetWithOwnDescriptor
export function OrdinarySetWithOwnDescriptor(
  O /* : ObjectValue */,
  P /* : PropertyKey */,
  V /* : Value */,
  Receiver /* : Value */,
  ownDesc /* : PropertyDescriptor | UndefinedValue */,
) {
  Assert(IsPropertyKey(P));

  if (ownDesc instanceof UndefinedValue) {
    const parent = Q(O.GetPrototypeOf());
    if (!(parent instanceof NullValue)) {
      return Q(parent.Set(P, V, Receiver));
    }
    ownDesc = ({
      Value: NewValue(undefined),
      Writable: true,
      Enumerable: true,
      Configurable: true,
    } /* : PropertyDescriptor */);
  }

  if (IsDataDescriptor(ownDesc)) {
    if (ownDesc.Writable === false) {
      return NewValue(false);
    }
    if (Type(Receiver) !== 'Object') {
      return NewValue(false);
    }
    const existingDescriptor = Q(Receiver.GetOwnProperty(P));
    if (!(existingDescriptor instanceof UndefinedValue)) {
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
  if (!setter || setter instanceof UndefinedValue) {
    return NewValue(false);
  }
  Q(Call(setter, Receiver, [V]));
  return NewValue(true);
}

// 9.1.10.1 OrdinaryDelete
export function OrdinaryDelete(O /* : ObjectValue */, P /* : PropertyKey */) {
  Assert(IsPropertyKey(P));
  const desc = Q(O.GetOwnProperty(P));
  if (desc instanceof UndefinedValue) {
    return NewValue(true);
  }
  if (desc.Configurable === true) {
    O.properties.delete(P);
    return NewValue(true);
  }
  return NewValue(false);
}

// 9.1.11.1
export function OrdinaryOwnPropertyKeys(O /* : ObjectValue */) /* : List<PropertyKey> */ {
  const keys = [];

  const integerIndexes = [];
  const strings = [];
  const symbols = [];
  for (const key of O.properties.keys()) {
    const int = Number.parseInt(key, 10);
    if (int > 0 && int < (2 ** 53) - 1) {
      integerIndexes.push(key);
    } else if (Type(key) === 'String') {
      strings.push(key);
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
  proto /* : ObjectValue | NullValue */,
  internalSlotsList /* : ?List<string> */,
) /* : ObjectValue */ {
  if (!internalSlotsList) {
    internalSlotsList = [];
  }

  const obj = new ObjectValue(surroundingAgent.currentRealmRecord, proto);

  // The following steps happen in ObjectValue constructor:
  //
  // Set obj's essential internal methods to the default ordinary
  // object definitions specified in 9.1.
  //
  // Set obj.[[Prototype]] to proto.
  // Set obj.[[Extensible]] to true.

  return obj;
}

// 9.1.13 OrdinaryCreateFromConstructor
export function OrdinaryCreateFromConstructor(
  constructor /* : FunctionValue */,
  intrinsicDefaultProto /* : string */,
  internalSlotsList /* : ?List<string> */,
) {
  // Assert: intrinsicDefaultProto is a String value that
  // is this specification's name of an intrinsic object.
  const proto = Q(GetPrototypeFromConstructor(constructor, intrinsicDefaultProto));
  return ObjectCreate(proto, internalSlotsList);
}

// 9.1.14 GetPrototypeFromConstructor
export function GetPrototypeFromConstructor(
  constructor /* : FunctionValue */, intrinsicDefaultProto /* : string */,
) {
  // Assert: intrinsicDefaultProto is a String value that
  // is this specification's name of an intrinsic object.
  Assert(IsCallable(constructor));
  let proto = Q(Get(constructor, NewValue('prototype')));
  if (Type(proto) !== 'Object') {
    const realm = Q(GetFunctionRealm(constructor));
    proto = realm.Intrinsics[intrinsicDefaultProto];
  }
  return proto;
}

// 9.3.3 CreateBuiltinFunction
export function CreateBuiltinFunction(
  steps /* : BuiltinFunctionCallback */,
  internalSlotsList /* : string[] */,
  realm /* : ?Realm */,
  prototype /* : ?ObjectValue | ?NullValue */,
) /* : BuiltinFunctionValue */ {
  if (!realm) {
    // If realm is not present, set realm to the current Realm Record.
    realm = surroundingAgent.currentRealmRecord;
  }

  if (!prototype) {
    prototype = realm.Intrinsics['%FunctionPrototype%'];
  }

  // Let func be a new built-in function object that when
  // called performs the action described by steps.
  const func = NewValue(steps, realm);

  internalSlotsList.forEach((slot) => {
    // $FlowFixMe
    func[slot] = undefined;
  });

  func.Realm = realm;
  func.Prototype = prototype;
  func.Extensible = true;
  func.ScriptOrModule = null;

  return func;
}

// 9.4.2.4 ArraySetLength
export function ArraySetLength(A /* : ArrayValue */, Desc /* : PropertyDescriptor */) {
  const lengthStr = NewValue('length');
  if ('Value' in Desc === false) {
    return OrdinaryDefineOwnProperty(A, lengthStr, Desc);
  }
  const newLenDesc = { ...Desc };
  const newLen = Q(ToUint32(Desc.Value));
  const numberLen = Q(ToNumber(Desc.Value));
  if (newLen.numberValue() !== numberLen.numberValue()) {
    surroundingAgent.Throw('RangeError');
  }
  newLenDesc.Value = newLen;
  const oldLenDesc = ((OrdinaryGetOwnProperty(A, lengthStr)/* : any */)/* : PropertyDescriptor */);
  Assert(!(oldLenDesc instanceof UndefinedValue) && !IsAccessorDescriptor(oldLenDesc));
  let oldLen = oldLenDesc.Value;
  if (newLen.numberValue() > oldLen.numberValue()) {
    return OrdinaryDefineOwnProperty(A, lengthStr, newLenDesc);
  }
  if (oldLenDesc.Writable === false) {
    return NewValue(false);
  }
  let newWritable;
  if (!('Writable' in newLenDesc) || newLenDesc.Writable === true) {
    newWritable = true;
  } else {
    newWritable = false;
    newLenDesc.Writable = true;
  }
  const succeeded = X(OrdinaryDefineOwnProperty(A, lengthStr, newLenDesc));
  if (succeeded.isFalse()) {
    return NewValue(false);
  }
  while (newLen.numberValue() < oldLen.numberValue()) {
    oldLen = NewValue(oldLen.numberValue() - 1);
    const deleteSucceeded = X(A.Delete(X(ToString(oldLen))));
    if (deleteSucceeded === false) {
      newLenDesc.Value = NewValue(oldLen.numberValue() + 1);
      if (newWritable === false) {
        newLenDesc.Writable = false;
      }
      X(OrdinaryDefineOwnProperty(A, lengthStr, newLenDesc));
      return NewValue(false);
    }
  }
  if (newWritable === false) {
    return OrdinaryDefineOwnProperty(A, lengthStr, {
      Writable: false,
    });
  }
  return NewValue(true);
}
