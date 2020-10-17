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
  OrdinaryDelete,
  GetValueFromBuffer,
  SetValueInBuffer,
  ToString,
  ToNumber,
  ToBigInt,
  isIntegerIndex,
  typedArrayInfoByName,
} from './all.mjs';

export function isIntegerIndexedExoticObject(O) {
  return O.GetOwnProperty === IntegerIndexedGetOwnProperty;
}

// 9.4.5.1 #sec-integer-indexed-exotic-objects-getownproperty-p
export function IntegerIndexedGetOwnProperty(P) {
  const O = this;
  // 1. Assert: IsPropertyKey(P) is true.
  Assert(IsPropertyKey(P));
  // 2. Assert: O is an Integer-Indexed exotic object.
  Assert(isIntegerIndexedExoticObject(O));
  // 3. If Type(P) is String, then
  if (Type(P) === 'String') {
    // a. Let numericIndex be ! CanonicalNumericIndexString(P).
    const numericIndex = X(CanonicalNumericIndexString(P));
    // b. If numericIndex is not undefined, then
    if (numericIndex !== Value.undefined) {
      // i. Let value be ! IntegerIndexedElementGet(O, numericIndex).
      const value = X(IntegerIndexedElementGet(O, numericIndex));
      // ii. If value is undefined, return undefined.
      if (value === Value.undefined) {
        return Value.undefined;
      }
      // iii. Return the PropertyDescriptor { [[Value]]: value, [[Writable]]: true, [[Enumerable]]: true, [[Configurable]]: true }.
      return Descriptor({
        Value: value,
        Writable: Value.true,
        Enumerable: Value.true,
        Configurable: Value.true,
      });
    }
  }
  // 4. Return OrdinaryGetOwnProperty(O, P).
  return OrdinaryGetOwnProperty(O, P);
}

// 9.4.5.2 #sec-integer-indexed-exotic-objects-hasproperty-p
export function IntegerIndexedHasProperty(P) {
  const O = this;
  // 1. Assert: IsPropertyKey(P) is true.
  Assert(IsPropertyKey(P));
  // 2. Assert: O is an Integer-Indexed exotic object.
  Assert(isIntegerIndexedExoticObject(O));
  // 3. If Type(P) is String, then
  if (Type(P) === 'String') {
    // a. Let numericIndex be ! CanonicalNumericIndexString(P).
    const numericIndex = X(CanonicalNumericIndexString(P));
    // b. If numericIndex is not undefined, then
    if (numericIndex !== Value.undefined) {
      // i. Let buffer be O.[[ViewedArrayBuffer]].
      const buffer = O.ViewedArrayBuffer;
      // ii. If IsDetachedBuffer(buffer) is true, return false.
      if (IsDetachedBuffer(buffer) === Value.true) {
        return Value.false;
      }
      // iii. If ! IsValidIntegerIndex(O, numericIndex) is false, return false.
      if (IsValidIntegerIndex(O, numericIndex) === Value.false) {
        return Value.false;
      }
      // iv. Return true.
      return Value.true;
    }
  }
  // 4. Return ? OrdinaryHasProperty(O, P)
  return Q(OrdinaryHasProperty(O, P));
}

// #sec-integer-indexed-exotic-objects-defineownproperty-p-desc
export function IntegerIndexedDefineOwnProperty(P, Desc) {
  const O = this;
  // 1. Assert: IsPropertyKey(P) is true.
  Assert(IsPropertyKey(P));
  // 2. Assert: O is an Integer-Indexed exotic object.
  Assert(isIntegerIndexedExoticObject(O));
  // 3. If Type(P) is String, then
  if (Type(P) === 'String') {
    // a. Let numericIndex be ! CanonicalNumericIndexString(P).
    const numericIndex = X(CanonicalNumericIndexString(P));
    // b. If numericIndex is not undefined, then
    if (numericIndex !== Value.undefined) {
      // i. If ! IsValidIntegerIndex(O, numericIndex) is false, return false.
      if (IsValidIntegerIndex(O, numericIndex) === Value.false) {
        return Value.false;
      }
      // ii. If IsAccessorDescriptor(Desc) is true, return false.
      if (IsAccessorDescriptor(Desc)) {
        return Value.false;
      }
      // iii. If Desc has a [[Configurable]] field and if Desc.[[Configurable]] is true, return false.
      if (Desc.Configurable === Value.true) {
        return Value.false;
      }
      // iv. If Desc has an [[Enumerable]] field and if Desc.[[Enumerable]] is false, return false.
      if (Desc.Enumerable === Value.false) {
        return Value.false;
      }
      // v. If Desc has a [[Writable]] field and if Desc.[[Writable]] is false, return false.
      if (Desc.Writable === Value.false) {
        return Value.false;
      }
      // vi. If Desc has a [[Value]] field, then
      if (Desc.Value !== undefined) {
        // 1. Let value be Desc.[[Value]].
        const value = Desc.Value;
        // 2. Return ? IntegerIndexedElementSet(O, numericIndex, value).
        return Q(IntegerIndexedElementSet(O, numericIndex, value));
      }
      // vii. Return true.
      return Value.true;
    }
  }
  // 4. Return ! OrdinaryDefineOwnProperty(O, P, Desc).
  return Q(OrdinaryDefineOwnProperty(O, P, Desc));
}

// 9.4.5.4 #sec-integer-indexed-exotic-objects-get-p-receiver
export function IntegerIndexedGet(P, Receiver) {
  const O = this;
  // 1. Assert: IsPropertykey(P) is true.
  Assert(IsPropertyKey(P));
  // 2. If Type(P) is String, then
  if (Type(P) === 'String') {
    // a. Let numericIndex be ! CanonicalNumericIndexString(P).
    const numericIndex = X(CanonicalNumericIndexString(P));
    // b. If numericIndex is not undefined, then
    if (numericIndex !== Value.undefined) {
      // i. Return ! IntegerIndexedElementGet(O, numericIndex).
      return X(IntegerIndexedElementGet(O, numericIndex));
    }
  }
  // 3. Return ? OrdinaryGet(O, P, Receiver).
  return Q(OrdinaryGet(O, P, Receiver));
}

// 9.4.5.5 #sec-integer-indexed-exotic-objects-set-p-v-receiver
export function IntegerIndexedSet(P, V, Receiver) {
  const O = this;
  // 1. Assert: IsPropertyKey(P) is true.
  Assert(IsPropertyKey(P));
  // 2. If Type(P) is String, then
  if (Type(P) === 'String') {
    // a. Let numericIndex be ! CanonicalNumericIndexString(P).
    const numericIndex = X(CanonicalNumericIndexString(P));
    // b. If numericIndex is not undefined, then
    if (numericIndex !== Value.undefined) {
      // i. Return ? IntegerIndexedElementSet(O, numericIndex, V).
      return Q(IntegerIndexedElementSet(O, numericIndex, V));
    }
  }
  // 3. Return ? OrdinarySet(O, P, V, Receiver).
  return Q(OrdinarySet(O, P, V, Receiver));
}

// #sec-integer-indexed-exotic-objects-delete-p
export function IntegerIndexedDelete(P) {
  const O = this;
  // 1. Assert: IsPropertyKey(P) is true.
  Assert(IsPropertyKey(P));
  // 2. Assert: O is an Integer-Indexed exotic object.
  Assert(isIntegerIndexedExoticObject(O));
  // 3. If Type(P) is String, then
  if (Type(P) === 'String') {
    // a. Let numericIndex be ! CanonicalNumericIndexString(P).
    const numericIndex = X(CanonicalNumericIndexString(P));
    // b. If numericIndex is not undefined, then
    if (numericIndex !== Value.undefined) {
      // i. If IsDetachedBuffer(O.[[ViewedArrayBuffer]]) is true, return true.
      if (IsDetachedBuffer(O.ViewedArrayBuffer) === Value.true) {
        return Value.true;
      }
      // ii. If ! IsValidIntegerIndex(O, numericIndex) is false, return true.
      if (X(IsValidIntegerIndex(O, numericIndex)) === Value.false) {
        return Value.true;
      }
      // iii. Return false.
      return Value.false;
    }
  }
  // 4. Return ? OrdinaryDelete(O, P).
  return Q(OrdinaryDelete(O, P));
}

// 9.4.5.6 #sec-integer-indexed-exotic-objects-ownpropertykeys
export function IntegerIndexedOwnPropertyKeys() {
  const O = this;
  // 1. Let keys be a new empty List.
  const keys = [];
  // 2. Assert: O is an Integer-Indexed exotic object.
  Assert(isIntegerIndexedExoticObject(O));
  // 3. Let len be O.[[ArrayLength]].
  const len = O.ArrayLength.numberValue();
  // 4. For each integer i starting with 0 such that i < len, in ascending order, do
  for (let i = 0; i < len; i += 1) {
    // a. Add ! ToString(i) as the last element of keys.
    keys.push(X(ToString(new Value(i))));
  }
  // 5. For each own property key P of O such that Type(P) is String and P is not an integer index, in ascending chronological order of property creation, do
  for (const P of O.properties.keys()) {
    if (Type(P) === 'String') {
      if (!isIntegerIndex(P)) {
        // a. Add P as the last element of keys.
        keys.push(P);
      }
    }
  }
  // 6. For each own property key P of O such that Type(P) is Symbol, in ascending chronological order of property creation, do
  for (const P of O.properties.keys()) {
    if (Type(P) === 'Symbol') {
      // a. Add P as the last element of keys.
      keys.push(P);
    }
  }
  // 7. Return keys.
  return keys;
}

// #sec-integerindexedelementget
export function IntegerIndexedElementGet(O, index) {
  // 1. Assert: O is an Integer-Indexed exotic object.
  Assert(isIntegerIndexedExoticObject(O));
  // 2. Assert: Type(index) is Number.
  Assert(Type(index) === 'Number');
  // 3. Let buffer be O.[[ViewedArrayBuffer]].
  const buffer = O.ViewedArrayBuffer;
  // 4. If IsDetachedBuffer(buffer) is true, return undefined.
  if (IsDetachedBuffer(buffer) === Value.true) {
    return Value.undefined;
  }
  // 5. If ! IsValidIntegerIndex(O, index) is false, return undefined.
  if (IsValidIntegerIndex(O, index) === Value.false) {
    return Value.undefined;
  }
  // 6. Let offset be O.[[ByteOffset]].
  const offset = O.ByteOffset;
  // 7. Let arrayTypeName be the String value of O.[[TypedArrayName]].
  const arrayTypeName = O.TypedArrayName.stringValue();
  // 8. Let elementSize be the Element Size value specified in Table 61 for arrayTypeName.
  const elementSize = typedArrayInfoByName[arrayTypeName].ElementSize;
  // 9. Let indexedPosition be (index × elementSize) + offset.
  const indexedPosition = new Value((index.numberValue() * elementSize) + offset.numberValue());
  // 10. Let elementType be the Element Type value in Table 61 for arrayTypeName.
  const elementType = typedArrayInfoByName[arrayTypeName].ElementType;
  // 11. Return GetValueFromBuffer(buffer, indexedPosition, elementType, true, Unordered).
  return GetValueFromBuffer(buffer, indexedPosition, elementType, Value.true, 'Unordered');
}

// #sec-integerindexedelementset
export function IntegerIndexedElementSet(O, index, value) {
  // 1. Assert: O is an Integer-Indexed exotic object.
  Assert(isIntegerIndexedExoticObject(O));
  // 2. Assert: Type(index) is Number.
  Assert(Type(index) === 'Number');
  // 3. If O.[[ContentType]] is BigInt, let numValue be ? ToBigInt(value).
  // 4. Otherwise, let numValue be ? ToNumber(value).
  let numValue;
  if (O.ContentType === 'BigInt') {
    numValue = Q(ToBigInt(value));
  } else {
    numValue = Q(ToNumber(value));
  }
  // 5. Let buffer be O.[[ViewedArrayBuffer]].
  const buffer = O.ViewedArrayBuffer;
  // 6. If IsDetachedBuffer(buffer) is true, return false.
  if (IsDetachedBuffer(buffer) === Value.true) {
    return Value.false;
  }
  // 7. If ! IsValidIntegerIndex(O, index) is false, return false.
  if (IsValidIntegerIndex(O, index) === Value.false) {
    return Value.false;
  }
  // 8. Let offset be O.[[ByteOffset]].
  const offset = O.ByteOffset;
  // 9. Let arrayTypeName be the String value of O.[[TypedArrayName]].
  const arrayTypeName = O.TypedArrayName.stringValue();
  // 10. Let elementSize be the Element Size value specified in Table 61 for arrayTypeName.
  const elementSize = typedArrayInfoByName[arrayTypeName].ElementSize;
  // 11. Let indexedPosition be (index × elementSize) + offset.
  const indexedPosition = new Value((index.numberValue() * elementSize) + offset.numberValue());
  // 12. Let elementType be the Element Type value in Table 61 for arrayTypeName.
  const elementType = typedArrayInfoByName[arrayTypeName].ElementType;
  // 13. Perform SetValueInBuffer(buffer, indexedPosition, elementType, numValue, true, Unordered).
  X(SetValueInBuffer(buffer, indexedPosition, elementType, numValue, Value.true, 'Unordered'));
  // 14. Return true.
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
  // 8. Set A.[[Delete]] as specified in 9.4.5.6.
  A.Delete = IntegerIndexedDelete;
  // 9. Set A.[[OwnPropertyKeys]] as specified in 9.4.5.6.
  A.OwnPropertyKeys = IntegerIndexedOwnPropertyKeys;
  // 10. Set A.[[Prototype]] to prototype.
  A.Prototype = prototype;
  // 11. Return A.
  return A;
}
