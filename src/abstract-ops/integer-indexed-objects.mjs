import { surroundingAgent } from '../engine.mjs';
import { Value, Type, Descriptor } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import {
  Assert,
  CanonicalNumericIndexString,
  IsAccessorDescriptor,
  IsDetachedBuffer,
  IsPropertyKey,
  IsValidIntegerIndex,
  MakeBasicObject,
  OrdinaryGetOwnProperty,
  OrdinaryHasProperty,
  OrdinaryDefineOwnProperty,
  OrdinaryGet,
  OrdinarySet,
  GetValueFromBuffer,
  SetValueInBuffer,
  ToString,
  ToNumber,
  isIntegerIndex,
  typedArrayInfo,
} from './all.mjs';

export function isIntegerIndexedExoticObject(O) {
  return O.GetOwnProperty === IntegerIndexedGetOwnProperty;
}

// 9.4.5.1 #sec-integer-indexed-exotic-objects-getownproperty-p
export function IntegerIndexedGetOwnProperty(P) {
  const O = this;
  Assert(IsPropertyKey(P));
  Assert(isIntegerIndexedExoticObject(O));
  if (Type(P) === 'String') {
    const numericIndex = X(CanonicalNumericIndexString(P));
    if (numericIndex !== Value.undefined) {
      const value = Q(IntegerIndexedElementGet(O, numericIndex));
      if (value === Value.undefined) {
        return Value.undefined;
      }
      return Descriptor({
        Value: value,
        Writable: Value.true,
        Enumerable: Value.true,
        Configurable: Value.false,
      });
    }
  }
  return OrdinaryGetOwnProperty(O, P);
}

// 9.4.5.2 #sec-integer-indexed-exotic-objects-hasproperty-p
export function IntegerIndexedHasProperty(P) {
  const O = this;
  Assert(IsPropertyKey(P));
  Assert(isIntegerIndexedExoticObject(O));
  if (Type(P) === 'String') {
    const numericIndex = X(CanonicalNumericIndexString(P));
    if (numericIndex !== Value.undefined) {
      const buffer = O.ViewedArrayBuffer;
      if (IsDetachedBuffer(buffer)) {
        return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
      }
      if (IsValidIntegerIndex(O, numericIndex) === Value.false) {
        return Value.false;
      }
      return Value.true;
    }
  }
  return Q(OrdinaryHasProperty(O, P));
}

// 9.4.5.3 #sec-integer-indexed-exotic-objects-defineownproperty-p-desc
export function IntegerIndexedDefineOwnProperty(P, Desc) {
  const O = this;
  Assert(IsPropertyKey(P));
  Assert(isIntegerIndexedExoticObject(O));
  if (Type(P) === 'String') {
    const numericIndex = X(CanonicalNumericIndexString(P));
    if (numericIndex !== Value.undefined) {
      if (IsValidIntegerIndex(O, numericIndex) === Value.false) {
        return Value.false;
      }
      if (IsAccessorDescriptor(Desc)) {
        return Value.false;
      }
      if (Desc.Configurable === Value.true) {
        return Value.false;
      }
      if (Desc.Enumerable === Value.false) {
        return Value.false;
      }
      if (Desc.Writable === Value.false) {
        return Value.false;
      }
      if (Desc.Value !== undefined) {
        const value = Desc.Value;
        return Q(IntegerIndexedElementSet(O, numericIndex, value));
      }
      return Value.true;
    }
  }
  return Q(OrdinaryDefineOwnProperty(O, P, Desc));
}

// 9.4.5.4 #sec-integer-indexed-exotic-objects-get-p-receiver
export function IntegerIndexedGet(P, Receiver) {
  const O = this;
  Assert(IsPropertyKey(P));
  if (Type(P) === 'String') {
    const numericIndex = X(CanonicalNumericIndexString(P));
    if (numericIndex !== Value.undefined) {
      return Q(IntegerIndexedElementGet(O, numericIndex));
    }
  }
  return Q(OrdinaryGet(O, P, Receiver));
}

// 9.4.5.5 #sec-integer-indexed-exotic-objects-set-p-v-receiver
export function IntegerIndexedSet(P, V, Receiver) {
  const O = this;
  Assert(IsPropertyKey(P));
  if (Type(P) === 'String') {
    const numericIndex = X(CanonicalNumericIndexString(P));
    if (numericIndex !== Value.undefined) {
      return Q(IntegerIndexedElementSet(O, numericIndex, V));
    }
  }
  return Q(OrdinarySet(O, P, V, Receiver));
}

// 9.4.5.6 #sec-integer-indexed-exotic-objects-ownpropertykeys
export function IntegerIndexedOwnPropertyKeys() {
  const O = this;
  const keys = [];
  Assert(isIntegerIndexedExoticObject(O));
  const len = O.ArrayLength.numberValue();
  for (let i = 0; i < len; i += 1) {
    keys.push(X(ToString(new Value(i))));
  }
  for (const P of O.properties.keys()) {
    if (Type(P) === 'String') {
      if (!isIntegerIndex(P)) {
        keys.push(P);
      }
    }
  }
  for (const P of O.properties.keys()) {
    if (Type(P) === 'Symbol') {
      keys.push(P);
    }
  }
  return keys;
}

// #sec-integerindexedelementget
export function IntegerIndexedElementGet(O, index) {
  Assert(isIntegerIndexedExoticObject(O));
  Assert(Type(index) === 'Number');
  const buffer = O.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  if (IsValidIntegerIndex(O, index) === Value.false) {
    return Value.undefined;
  }
  const offset = O.ByteOffset;
  const arrayTypeName = O.TypedArrayName.stringValue();
  const {
    ElementSize: elementSize,
    ElementType: elementType,
  } = typedArrayInfo.get(arrayTypeName);
  const indexedPosition = new Value((index.numberValue() * elementSize) + offset.numberValue());
  return GetValueFromBuffer(buffer, indexedPosition, elementType, true, 'Unordered');
}

// #sec-integerindexedelementset
export function IntegerIndexedElementSet(O, index, value) {
  Assert(isIntegerIndexedExoticObject(O));
  Assert(Type(index) === 'Number');
  const numValue = Q(ToNumber(value));
  const buffer = O.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  if (IsValidIntegerIndex(O, index) === Value.false) {
    return Value.false;
  }
  const offset = O.ByteOffset;
  const arrayTypeName = O.TypedArrayName.stringValue();
  const {
    ElementSize: elementSize,
    ElementType: elementType,
  } = typedArrayInfo.get(arrayTypeName);
  const indexedPosition = new Value((index.numberValue() * elementSize) + offset.numberValue());
  X(SetValueInBuffer(buffer, indexedPosition, elementType, numValue, true, 'Unordered'));
  return Value.true;
}

// #sec-integerindexedobjectcreate
export function IntegerIndexedObjectCreate(prototype) {
  // 1. Let internalSlotsList be « [[Prototype]], [[Extensible]], [[ViewedArrayBuffer]], [[TypedArrayName]], [[ContentType]], [[ByteLength]], [[ByteOffset]], [[ArrayLength]] ».
  const internalSlotsList = [
    'Prototype',
    'Extensible',
    'ViewedArrayBuffer',
    'TypedArrayName',
    'ContentType',
    'ByteLength',
    'ByteOffset',
    'ArrayLength',
  ];
  // 2. Let A be ! MakeBasicObject(internalSlotsList).
  const A = X(MakeBasicObject(internalSlotsList));
  // 3. Set A.[[GetOwnProperty]] as specified in 9.4.5.1.
  A.GetOwnProperty = IntegerIndexedGetOwnProperty;
  // 4. Set A.[[HasProperty]] as specified in 9.4.5.2.
  A.HasProperty = IntegerIndexedHasProperty;
  // 5. Set A.[[DefineOwnProperty]] as specified in 9.4.5.3.
  A.DefineOwnProperty = IntegerIndexedDefineOwnProperty;
  // 6. Set A.[[Get]] as specified in 9.4.5.4.
  A.Get = IntegerIndexedGet;
  // 7. Set A.[[Set]] as specified in 9.4.5.5.
  A.Set = IntegerIndexedSet;
  // 8. Set A.[[OwnPropertyKeys]] as specified in 9.4.5.6.
  A.OwnPropertyKeys = IntegerIndexedOwnPropertyKeys;
  // 9. Set A.[[Prototype]] to prototype.
  A.Prototype = prototype;
  // 10. Return A.
  return A;
}
