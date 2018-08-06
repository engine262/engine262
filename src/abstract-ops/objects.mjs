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
    return true;
  }
  if (extensible === false) {
    return false;
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

  const X = O.properties.get(P);

  if (IsDataDescriptor(X)) {
    D.Value = X.Value;
    D.Writable = X.Writable;
  } else if (IsAccessorDescriptor(X)) {
    D.Get = X.Get;
    D.Set = X.Set;
  }
  D.Enumerable = X.Enumerable;
  D.Configurable = X.Configurable;

  return D;
}

// 9.1.6.1 OrdinaryDefineOwnProperty
export function OrdinaryDefineOwnProperty(
  O /* : ObjectValue */,
  P /* : PropertyKey */,
  Desc /* : PropertyDescriptor */,
) {
  const current = O.GetOwnProperty(P);
  const extensible = IsExtensible(O);
  return ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current);
}

// 9.1.6.3 ValidateAndApplyPropertyDescriptor
export function ValidateAndApplyPropertyDescriptor(
  O /* : UndefinedValue | ObjectValue */,
  P /* : UndefinedValue | PropertyKey */,
  extensible /* : BooleanValue */,
  Desc /* : PropertyDescriptor */,
  current /* : PropertyDescriptor */,
) {
  Assert(O instanceof UndefinedValue || IsPropertyKey(P));

  if (current instanceof UndefinedValue) {
    if (extensible.isFalse()) {
      return false;
    }

    Assert(extensible.isTrue());

    if (IsGenericDescriptor(Desc) || IsDataDescriptor(Desc)) {
      if (!(O instanceof UndefinedValue)) {
        O.properties.set(P, {
          Value: 'Value' in Desc ? Desc.Value : undefinedValue,
          Writable: 'Writable' in Desc ? Desc.Writable : false,
          Enumerable: 'Enumerable' in Desc ? Desc.Enumerable : false,
          Configurable: 'Configurable' in Desc ? Desc.Configurable : false,
        });
      }
    } else {
      Assert(IsAccessorDescriptor(Desc));
      if (!(O instanceof UndefinedValue)) {
        O.properties.set(P, {
          Get: 'Get' in Desc ? Desc.Get : undefinedValue,
          Set: 'Set' in Desc ? Desc.Set : undefinedValue,
          Enumerable: 'Enumerable' in Desc ? Desc.Enumerable : false,
          Configurable: 'Configurable' in Desc ? Desc.Configurable : false,
        });
      }
    }

    return true;
  }

  if (Object.keys(Desc).length === 0) {
    return true;
  }

  if (current.Configurable === false) {
    if (Desc.Configurable === true) {
      return false;
    }

    if ('Enumerable' in Desc && Desc.Enumerable !== current.Enumerable) {
      return false;
    }
  }

  if (IsGenericDescriptor(Desc)) {
    // No further validation is required.
  } else if (IsDataDescriptor(current) !== IsDataDescriptor(Desc)) {
    if (current.Configurable === false) {
      return false;
    }
    if (IsDataDescriptor(current)) {
      if (!(O instanceof UndefinedValue)) {
        const entry = O.properties.get(P);
        delete entry.Value;
        delete entry.Writable;
        entry.Get = undefinedValue;
        entry.Set = undefinedValue;
      }
    } else {
      if (!(O instanceof UndefinedValue)) {
        const entry = O.properties.get(P);
        delete entry.Get;
        delete entry.Set;
        entry.Value = undefinedValue;
        entry.Writable = false;
      }
    }
  } else if (IsDataDescriptor(current) && IsDataDescriptor(Desc)) {
    if (current.Configurable === false && current.Writable === false) {
      if ('Writable' in Desc && Desc.Writable === true) {
        return false;
      }
      if ('Value' in Desc && SameValue(Desc.Value, current.Value) === false) {
        return false;
      }
      return true;
    }
  } else {
    Assert(IsAccessorDescriptor(current) && IsAccessorDescriptor(Desc));
    if (current.Configurable === false) {
      if ('Set' in Desc && SameValue(Desc.Set, current.Set) === false) {
        return false;
      }
      if ('Get' in Desc && SameValue(Desc.Get, current.Get)) {
        return false;
      }
      return true;
    }
  }

  if (!(O instanceof UndefinedValue)) {
    O.properties.set(P, current);
    Object.keys(Desc).forEach((field) => {
      current[field] = Desc[field];
    });
  }

  return true;
}

// 9.1.7.1 OrdinaryHasProperty
export function OrdinaryHasProperty(O /* : ObjectValue */, P /* : PropertyKey */) {
  Assert(IsPropertyKey(P));

  const hasOwn = O.GetOwnProperty(P);
  if (!(hasOwn instanceof UndefinedValue)) {
    return true;
  }
  const parent = O.GetPrototypeOf();
  if (!parent.isNull()) {
    return parent.HasOwnProperty(P);
  }
  return false;
}

// 9.1.8.1
export function OrdinaryGet(O /* : ObjectValue */, P /* : PropertyKey */, Receiver /* : Value */) {
  Assert(IsPropertyKey(P));

  const desc = O.GetOwnProperty(P);
  if (desc === undefined) {
    const parent = O.GetPrototypeOf();
    if (parent.isNull()) {
      return undefinedValue;
    }
    return parent.Get(P, Receiver);
  }
  if (IsDataDescriptor(desc)) {
    return desc.Value;
  }
  Assert(IsAccessorDescriptor(desc));
  const getter = desc.Get;
  if (getter instanceof UndefinedValue) {
    return undefinedValue;
  }
  return Call(getter, Receiver);
}

// 9.1.9.1 OrdinarySet
export function OrdinarySet(
  O /* : ObjectValue */,
  P /* : PropertyKey */,
  V /* : Value */,
  Receiver /* : Value */,
) {
  Assert(IsPropertyKey(P));
  const ownDesc = O.GetOwnProperty(P);
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
    const parent = O.GetPrototypeOf();
    if (!parent.isNull()) {
      return parent.Set(P, V, Receiver);
    }
    ownDesc = ({
      Value: undefinedValue,
      Writable: true,
      Enumerable: true,
      Configurable: true,
    } /* : PropertyDescriptor */);
  }

  if (IsDataDescriptor(ownDesc)) {
    if (ownDesc.Writable === false) {
      return false;
    }
    if (Type(Receiver) !== 'Object') {
      return false;
    }
    /* :: Receiver = ((Receiver : any) : ObjectValue); */
    const existingDescriptor = Receiver.GetOwnProperty(P);
    if (!(existingDescriptor instanceof UndefinedValue)) {
      if (IsAccessorDescriptor(existingDescriptor)) {
        return false;
      }
      if (!existingDescriptor.writable) {
        return false;
      }
      const valueDesc = { Value: V };
      return Receiver.DefineOwnProperty(P, valueDesc);
    }
    return CreateDataProperty(Receiver, P, V);
  }

  Assert(IsAccessorDescriptor(ownDesc));
  const setter = ownDesc.Set;
  if (!setter || setter instanceof UndefinedValue) {
    return false;
  }
  Call(setter, Receiver, [V]);
  return true;
}

// 9.1.10.1 OrdinaryDelete
export function OrdinaryDelete(O /* : ObjectValue */, P /* : PropertyKey */) {
  Assert(IsPropertyKey(P));
  const desc = O.GetOwnProperty(P);
  if (desc instanceof UndefinedValue) {
    return true;
  }
  if (desc.Configurable === true) {
    O.properties.delete(P);
    return true;
  }
  return false;
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
  const proto = GetPrototypeFromConstructor(constructor, intrinsicDefaultProto);
  return ObjectCreate(proto, internalSlotsList);
}

// 9.1.14 GetPrototypeFromConstructor
export function GetPrototypeFromConstructor(
  constructor /* : FunctionValue */, intrinsicDefaultProto /* : string */,
) {
  // Assert: intrinsicDefaultProto is a String value that
  // is this specification's name of an intrinsic object.
  Assert(IsCallable(constructor));
  let proto = Get(constructor, NewValue('prototype'));
  if (Type(proto) !== 'Object') {
    const realm = GetFunctionRealm(constructor);
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
  const newLen = ToUint32(Desc.Value);
  const newLenVal = newLen.numberValue();
  const numberLen = ToNumber(Desc.Value);
  if (newLenVal !== numberLen.numberValue()) {
    surroundingAgent.Throw('RangeError');
  }
  newLenDesc.Value = newLen;
  const oldLenDesc = ((OrdinaryGetOwnProperty(A, lengthStr)/* : any */)/* : PropertyDescriptor */);
  Assert(!(oldLenDesc instanceof UndefinedValue) && !IsAccessorDescriptor(oldLenDesc));
  const oldLen = oldLenDesc.Value;
  let oldLenVal = oldLen.numberValue();
  if (newLenVal > oldLenVal) {
    return OrdinaryDefineOwnProperty(A, lengthStr, newLenDesc);
  }
  if (oldLenDesc.Writable === false) {
    return false;
  }
  let newWritable;
  if (!('Writable' in newLenDesc) || newLenDesc.Writable === true) {
    newWritable = true;
  } else {
    newWritable = false;
    newLenDesc.Writable = true;
  }
  const succeeded = OrdinaryDefineOwnProperty(A, lengthStr, newLenDesc);
  if (succeeded === false) {
    return false;
  }
  while (newLenVal < oldLenVal) {
    oldLenVal -= 1;
    const deleteSucceeded = A.Delete(ToString(NewValue(oldLenVal)));
    if (deleteSucceeded === false) {
      newLenDesc.Value = NewValue(oldLenVal + 1);
      if (newWritable === false) {
        newLenDesc.Writable = false;
      }
      OrdinaryDefineOwnProperty(A, lengthStr, newLenDesc);
      return false;
    }
  }
  if (newWritable === false) {
    return OrdinaryDefineOwnProperty(A, lengthStr, {
      Writable: false,
    });
  }
  return true;
}
