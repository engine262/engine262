import {
  Value, NumberValue, SymbolValue, JSStringValue, Descriptor,
  ObjectValue,
  type ObjectInternalMethods,
  BooleanValue,
  UndefinedValue,
  NullValue,
} from '../value.mts';
import { Q, X, type ExpressionCompletion } from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import type { TypedArrayObject } from '../intrinsics/TypedArray.mts';
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
  F, R,
  type ExoticObject,
  type TypedArrayConstructorNames,
  type ArrayBufferObject,
} from './all.mts';

export interface IntegerIndexedObject extends ExoticObject {
  readonly Prototype: ObjectValue | NullValue;
  readonly Extensible: BooleanValue<false>;

  ViewedArrayBuffer: ArrayBufferObject | UndefinedValue;
  readonly ArrayLength: number;
  readonly ByteOffset: number;
  readonly ContentType: 'BigInt' | 'Number';
  readonly TypedArrayName: JSStringValue;
  readonly ByteLength: number;
}

export function isIntegerIndexedExoticObject(O: ObjectValue): O is IntegerIndexedObject {
  return O.GetOwnProperty === InternalMethods.GetOwnProperty;
}

const InternalMethods = {
  /** https://tc39.es/ecma262/#sec-integer-indexed-exotic-objects-getownproperty-p */
  GetOwnProperty(P) {
    const O = this;
    // 1. Assert: IsPropertyKey(P) is true.
    Assert(IsPropertyKey(P));
    // 2. Assert: O is an Integer-Indexed exotic object.
    Assert(isIntegerIndexedExoticObject(O));
    // 3. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be ! CanonicalNumericIndexString(P).
      const numericIndex = X(CanonicalNumericIndexString(P));
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
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
  },
  /** https://tc39.es/ecma262/#sec-integer-indexed-exotic-objects-hasproperty-p */
  HasProperty(P) {
    const O = this;
    // 1. Assert: IsPropertyKey(P) is true.
    Assert(IsPropertyKey(P));
    // 2. Assert: O is an Integer-Indexed exotic object.
    Assert(isIntegerIndexedExoticObject(O));
    // 3. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be ! CanonicalNumericIndexString(P).
      const numericIndex = X(CanonicalNumericIndexString(P));
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
      // i. Let buffer be O.[[ViewedArrayBuffer]].
        const buffer = O.ViewedArrayBuffer as ArrayBufferObject;
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
  },
  /** https://tc39.es/ecma262/#sec-integer-indexed-exotic-objects-defineownproperty */
  DefineOwnProperty(P, Desc) {
    const O = this;
    // 1. Assert: IsPropertyKey(P) is true.
    Assert(IsPropertyKey(P));
    // 2. Assert: O is an Integer-Indexed exotic object.
    Assert(isIntegerIndexedExoticObject(O));
    // 3. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be ! CanonicalNumericIndexString(P).
      const numericIndex = X(CanonicalNumericIndexString(P));
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
        // i. If ! IsValidIntegerIndex(O, numericIndex) is false, return false.
        if (IsValidIntegerIndex(O, numericIndex) === Value.false) {
          return Value.false;
        }
        // ii. If IsAccessorDescriptor(Desc) is true, return false.
        if (IsAccessorDescriptor(Desc)) {
          return Value.false;
        }
        // iii. If Desc has a [[Configurable]] field and if Desc.[[Configurable]] is true, return false.
        if (Desc.Configurable === Value.false) {
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
  },
  /** https://tc39.es/ecma262/#sec-integer-indexed-exotic-objects-get-p-receiver */
  Get(P, Receiver) {
    const O = this;
    // 1. Assert: IsPropertykey(P) is true.
    Assert(IsPropertyKey(P));
    // 2. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be ! CanonicalNumericIndexString(P).
      const numericIndex = X(CanonicalNumericIndexString(P));
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
        // i. Return ! IntegerIndexedElementGet(O, numericIndex).
        return X(IntegerIndexedElementGet(O, numericIndex));
      }
    }
    // 3. Return ? OrdinaryGet(O, P, Receiver).
    return Q(OrdinaryGet(O, P, Receiver));
  },
  /** https://tc39.es/ecma262/#sec-integer-indexed-exotic-objects-set-p-v-receiver */
  Set(P, V, Receiver) {
    const O = this;
    // 1. Assert: IsPropertyKey(P) is true.
    Assert(IsPropertyKey(P));
    // 2. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be ! CanonicalNumericIndexString(P).
      const numericIndex = X(CanonicalNumericIndexString(P));
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
        // i. Perform ? IntegerIndexedElementSet(O, numericIndex, V).
        Q(IntegerIndexedElementSet(O, numericIndex, V));
        // ii. Return true.
        return Value.true;
      }
    }
    // 3. Return ? OrdinarySet(O, P, V, Receiver).
    return Q(OrdinarySet(O, P, V, Receiver));
  },
  /** https://tc39.es/ecma262/#sec-integer-indexed-exotic-objects-delete-p */
  Delete(P) {
    const O = this;
    // 1. Assert: IsPropertyKey(P) is true.
    Assert(IsPropertyKey(P));
    // 2. Assert: O is an Integer-Indexed exotic object.
    Assert(isIntegerIndexedExoticObject(O));
    // 3. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be ! CanonicalNumericIndexString(P).
      const numericIndex = X(CanonicalNumericIndexString(P));
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
      // i. If IsDetachedBuffer(O.[[ViewedArrayBuffer]]) is true, return true.
        if (IsDetachedBuffer((O as TypedArrayObject).ViewedArrayBuffer as ArrayBufferObject) === Value.true) {
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
  },
  /** https://tc39.es/ecma262/#sec-integer-indexed-exotic-objects-ownpropertykeys */
  OwnPropertyKeys() {
    const O = this;
    // 1. Let keys be a new empty List.
    const keys = [];
    // 2. Assert: O is an Integer-Indexed exotic object.
    Assert(isIntegerIndexedExoticObject(O));
    // 3. Let len be O.[[ArrayLength]].
    const len = O.ArrayLength;
    // 4. For each integer i starting with 0 such that i < len, in ascending order, do
    for (let i = 0; i < len; i += 1) {
      // a. Add ! ToString(𝔽(i)) as the last element of keys.
      keys.push(X(ToString(F(i))));
    }
    // 5. For each own property key P of O such that Type(P) is String and P is not an integer index, in ascending chronological order of property creation, do
    for (const P of O.properties.keys()) {
      if (P instanceof JSStringValue) {
        if (!isIntegerIndex(P)) {
          // a. Add P as the last element of keys.
          keys.push(P);
        }
      }
    }
    // 6. For each own property key P of O such that Type(P) is Symbol, in ascending chronological order of property creation, do
    for (const P of O.properties.keys()) {
      if (P instanceof SymbolValue) {
        // a. Add P as the last element of keys.
        keys.push(P);
      }
    }
    // 7. Return keys.
    return keys;
  },
} satisfies Partial<ObjectInternalMethods<IntegerIndexedObject>>;


/** https://tc39.es/ecma262/#sec-integerindexedelementget */
export function IntegerIndexedElementGet(O: IntegerIndexedObject, index: NumberValue) {
  // 1. Assert: O is an Integer-Indexed exotic object.
  Assert(isIntegerIndexedExoticObject(O));
  // 2. Assert: Type(index) is Number.
  Assert(index instanceof NumberValue);
  // 3. Let buffer be O.[[ViewedArrayBuffer]].
  const buffer = O.ViewedArrayBuffer as ArrayBufferObject;
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
  const arrayTypeName = O.TypedArrayName.stringValue() as TypedArrayConstructorNames;
  // 8. Let elementSize be the Element Size value specified in Table 61 for arrayTypeName.
  const elementSize = typedArrayInfoByName[arrayTypeName].ElementSize;
  // 9. Let indexedPosition be (ℝ(index) × elementSize) + offset.
  const indexedPosition = (R(index) * elementSize) + offset;
  // 10. Let elementType be the Element Type value in Table 61 for arrayTypeName.
  const elementType = typedArrayInfoByName[arrayTypeName].ElementType;
  // 11. Return GetValueFromBuffer(buffer, indexedPosition, elementType, true, Unordered).
  return GetValueFromBuffer(buffer, indexedPosition, elementType, Value.true, 'Unordered');
}

/** https://tc39.es/ecma262/#sec-integerindexedelementset */
export function IntegerIndexedElementSet(O: IntegerIndexedObject, index: NumberValue, value: Value): ExpressionCompletion<BooleanValue> {
  // 1. Assert: O is an Integer-Indexed exotic object.
  Assert(isIntegerIndexedExoticObject(O));
  // 2. Assert: Type(index) is Number.
  Assert(index instanceof NumberValue);
  // 3. If O.[[ContentType]] is BigInt, let numValue be ? ToBigInt(value).
  // 4. Otherwise, let numValue be ? ToNumber(value).
  let numValue;
  if (O.ContentType === 'BigInt') {
    numValue = Q(ToBigInt(value));
  } else {
    numValue = Q(ToNumber(value));
  }
  // 5. Let buffer be O.[[ViewedArrayBuffer]].
  const buffer = O.ViewedArrayBuffer as ArrayBufferObject;
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
  const arrayTypeName = O.TypedArrayName.stringValue() as TypedArrayConstructorNames;
  // 10. Let elementSize be the Element Size value specified in Table 61 for arrayTypeName.
  const elementSize = typedArrayInfoByName[arrayTypeName].ElementSize;
  // 11. Let indexedPosition be (ℝ(index) × elementSize) + offset.
  const indexedPosition = (R(index) * elementSize) + offset;
  // 12. Let elementType be the Element Type value in Table 61 for arrayTypeName.
  const elementType = typedArrayInfoByName[arrayTypeName].ElementType;
  // 13. Perform SetValueInBuffer(buffer, indexedPosition, elementType, numValue, true, Unordered).
  X(SetValueInBuffer(buffer, indexedPosition, elementType, numValue, Value.true, 'Unordered'));
  // 14. Return true.
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-integerindexedobjectcreate */
export function IntegerIndexedObjectCreate(prototype: ObjectValue) {
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
  const A = X(MakeBasicObject(internalSlotsList)) as Mutable<IntegerIndexedObject>;
  // 3. Set A.[[GetOwnProperty]] as specified in 9.4.5.1.
  A.GetOwnProperty = InternalMethods.GetOwnProperty;
  // 4. Set A.[[HasProperty]] as specified in 9.4.5.2.
  A.HasProperty = InternalMethods.HasProperty;
  // 5. Set A.[[DefineOwnProperty]] as specified in 9.4.5.3.
  A.DefineOwnProperty = InternalMethods.DefineOwnProperty;
  // 6. Set A.[[Get]] as specified in 9.4.5.4.
  A.Get = InternalMethods.Get;
  // 7. Set A.[[Set]] as specified in 9.4.5.5.
  A.Set = InternalMethods.Set;
  // 8. Set A.[[Delete]] as specified in 9.4.5.6.
  A.Delete = InternalMethods.Delete;
  // 9. Set A.[[OwnPropertyKeys]] as specified in 9.4.5.6.
  A.OwnPropertyKeys = InternalMethods.OwnPropertyKeys;
  // 10. Set A.[[Prototype]] to prototype.
  A.Prototype = prototype;
  // 11. Return A.
  return A;
}
