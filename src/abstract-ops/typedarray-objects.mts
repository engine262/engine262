import {
  ObjectValue, Value, NumberValue,
  JSStringValue,
  type ObjectInternalMethods,
  SymbolValue,
  Descriptor,
  UndefinedValue,
  BooleanValue,
} from '../value.mts';
import {
  Q, X, type ExpressionCompletion,
} from '../completion.mts';
import { __ts_cast__ } from '../helpers.mts';
import {
  type TypedArrayObject, TypedArrayElementSize, TypedArrayElementType,
} from '../intrinsics/TypedArray.mts';
import { isDataViewObject, type DataViewObject } from '../intrinsics/DataView.mts';
import {
  Assert,
  IsDetachedBuffer,
  R,
  ArrayBufferByteLength,
  IsFixedLengthArrayBuffer,
  type ArrayBufferObject,
  MakeBasicObject,
  isIntegerIndex,
  ToString,
  OrdinaryDelete,
  CanonicalNumericIndexString,
  F,
  IsAccessorDescriptor,
  OrdinaryDefineOwnProperty,
  OrdinaryGet,
  OrdinaryGetOwnProperty,
  OrdinaryHasProperty,
  OrdinarySet,
  GetValueFromBuffer,
  SetValueInBuffer,
  ToBigInt,
  ToNumber,
  IsSharedArrayBuffer,
  OrdinaryPreventExtensions,
  SameValue,
  IsIntegralNumber,
  IsViewOutOfBounds,
  MakeDataViewWithBufferWitnessRecord,
} from './all.mts';

const InternalMethods = {
  /** https://tc39.es/ecma262/#sec-typedarray-preventextensions */
  PreventExtensions() {
    const O = this;
    if (!IsTypedArrayFixedLength(O)) {
      return Value.false;
    }
    return OrdinaryPreventExtensions(O);
  },
  /** https://tc39.es/ecma262/#sec-typedarray-getownproperty */
  GetOwnProperty(P) {
    const O = this;
    // 3. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be CanonicalNumericIndexString(P).
      const numericIndex = CanonicalNumericIndexString(P);
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
        // i. Let value be TypedArrayGetElement(O, numericIndex).
        const value = TypedArrayGetElement(O, numericIndex);
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
  /** https://tc39.es/ecma262/#sec-typedarray-hasproperty */
  HasProperty(P) {
    const O = this;
    // 3. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be CanonicalNumericIndexString(P).
      const numericIndex = CanonicalNumericIndexString(P);
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
        return IsValidIntegerIndex(O, numericIndex);
      }
    }
    // 4. Return ? OrdinaryHasProperty(O, P)
    return Q(OrdinaryHasProperty(O, P));
  },
  /** https://tc39.es/ecma262/#sec-typedarray-defineownproperty */
  DefineOwnProperty(P, Desc) {
    const O = this;
    // 3. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be CanonicalNumericIndexString(P).
      const numericIndex = CanonicalNumericIndexString(P);
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
        // i. If ! IsValidIntegerIndex(O, numericIndex) is false, return false.
        if (IsValidIntegerIndex(O, numericIndex) === Value.false) {
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
        // ii. If IsAccessorDescriptor(Desc) is true, return false.
        if (IsAccessorDescriptor(Desc)) {
          return Value.false;
        }
        // v. If Desc has a [[Writable]] field and if Desc.[[Writable]] is false, return false.
        if (Desc.Writable === Value.false) {
          return Value.false;
        }
        // vi. If Desc has a [[Value]] field, then
        if (Desc.Value !== undefined) {
          return Q(TypedArraySetElement(O, numericIndex, Desc.Value));
        }
        // vii. Return true.
        return Value.true;
      }
    }
    // 4. Return ! OrdinaryDefineOwnProperty(O, P, Desc).
    return Q(OrdinaryDefineOwnProperty(O, P, Desc));
  },
  /** https://tc39.es/ecma262/#sec-typedarray-get */
  Get(P, Receiver) {
    const O = this;
    // 2. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be CanonicalNumericIndexString(P).
      const numericIndex = CanonicalNumericIndexString(P);
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
        // i. Return ! IntegerIndexedElementGet(O, numericIndex).
        return X(TypedArrayGetElement(O, numericIndex));
      }
    }
    // 3. Return ? OrdinaryGet(O, P, Receiver).
    return Q(OrdinaryGet(O, P, Receiver));
  },
  /** https://tc39.es/ecma262/#sec-typedarray-set */
  Set(P, V, Receiver) {
    const O = this;
    // 2. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be CanonicalNumericIndexString(P).
      const numericIndex = CanonicalNumericIndexString(P);
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
        if (SameValue(O, Receiver) === Value.true) {
          // i. Perform ? IntegerIndexedElementSet(O, numericIndex, V).
          Q(TypedArraySetElement(O, numericIndex, V));
          // ii. Return true.
          return Value.true;
        }
        if (IsValidIntegerIndex(O, numericIndex) === Value.false) {
          return Value.true;
        }
      }
    }
    // 3. Return ? OrdinarySet(O, P, V, Receiver).
    return Q(OrdinarySet(O, P, V, Receiver));
  },
  /** https://tc39.es/ecma262/#sec-typedarray-delete */
  Delete(P) {
    const O = this;
    // 3. If Type(P) is String, then
    if (P instanceof JSStringValue) {
      // a. Let numericIndex be ! CanonicalNumericIndexString(P).
      const numericIndex = CanonicalNumericIndexString(P);
      // b. If numericIndex is not undefined, then
      if (!(numericIndex instanceof UndefinedValue)) {
        // ii. If IsValidIntegerIndex(O, numericIndex) is false, return true.
        if (IsValidIntegerIndex(O, numericIndex) === Value.false) {
          return Value.true;
        } else {
          // iii. Return false.
          return Value.false;
        }
      }
    }
    // 4. Return ? OrdinaryDelete(O, P).
    return Q(OrdinaryDelete(O, P));
  },
  /** https://tc39.es/ecma262/#sec-typedarray-ownpropertykeys */
  OwnPropertyKeys() {
    const O = this;
    const taRecord = MakeTypedArrayWithBufferWitnessRecord(O, 'seq-cst');
    // 1. Let keys be a new empty List.
    const keys = [];
    if (!IsTypedArrayOutOfBounds(taRecord)) {
      const length = TypedArrayLength(taRecord);
      // 4. For each integer i starting with 0 such that i < len, in ascending order, do
      for (let i = 0; i < length; i += 1) {
        // a. Add ! ToString(𝔽(i)) as the last element of keys.
        keys.push(X(ToString(F(i))));
      }
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
} satisfies Partial<ObjectInternalMethods<TypedArrayObject>>;

/** https://tc39.es/ecma262/#sec-typedarray-with-buffer-witness-records */
export interface TypedArrayWithBufferWitnessRecord {
  readonly Object: TypedArrayObject;
  readonly CachedBufferByteLength: 'detached' | number;
}

/** https://tc39.es/ecma262/#sec-maketypedarraywithbufferwitnessrecord */
export function MakeTypedArrayWithBufferWitnessRecord(obj: TypedArrayObject, order: 'seq-cst' | 'unordered') {
  const buffer = obj.ViewedArrayBuffer;
  let byteLength: TypedArrayWithBufferWitnessRecord['CachedBufferByteLength'];
  if (IsDetachedBuffer(buffer as ArrayBufferObject) === Value.true) {
    byteLength = 'detached';
  } else {
    byteLength = ArrayBufferByteLength(buffer as ArrayBufferObject, order);
  }
  return { Object: obj, CachedBufferByteLength: byteLength };
}

/** https://tc39.es/ecma262/#sec-typedarraycreate */
export function TypedArrayCreate(prototype: ObjectValue) {
  const internalSlotsList = ['Prototype', 'Extensible', 'ViewedArrayBuffer', 'TypedArrayName', 'ContentType', 'ByteLength', 'ByteOffset', 'ArrayLength'] as const;
  const A = MakeBasicObject(internalSlotsList);
  A.PreventExtensions = InternalMethods.PreventExtensions;
  A.GetOwnProperty = InternalMethods.GetOwnProperty;
  A.HasProperty = InternalMethods.HasProperty;
  A.DefineOwnProperty = InternalMethods.DefineOwnProperty;
  A.Get = InternalMethods.Get;
  A.Set = InternalMethods.Set;
  A.Delete = InternalMethods.Delete;
  A.OwnPropertyKeys = InternalMethods.OwnPropertyKeys;
  A.Prototype = prototype;
  return A;
}

/** https://tc39.es/ecma262/#sec-typedarraybytelength */
export function TypedArrayByteLength(taRecord: TypedArrayWithBufferWitnessRecord): number {
  if (IsTypedArrayOutOfBounds(taRecord)) {
    return 0;
  }
  const length = TypedArrayLength(taRecord);
  if (length === 0) {
    return 0;
  }
  const O = taRecord.Object;
  if (O.ByteLength !== 'auto') {
    return O.ByteLength;
  }
  const elementSize = TypedArrayElementSize(O);
  return length * elementSize;
}

/** https://tc39.es/ecma262/#sec-typedarraylength */
export function TypedArrayLength(taRecord: TypedArrayWithBufferWitnessRecord): number {
  Assert(IsTypedArrayOutOfBounds(taRecord) === false);
  const O = taRecord.Object;
  if (O.ArrayLength !== 'auto') {
    return O.ArrayLength;
  }
  Assert(!IsFixedLengthArrayBuffer(O.ViewedArrayBuffer as ArrayBufferObject));
  const byteOffset = O.ByteOffset;
  const elementSize = TypedArrayElementSize(O);
  const bufferLength = taRecord.CachedBufferByteLength;
  Assert(bufferLength !== 'detached');
  return Math.floor((bufferLength - byteOffset) / elementSize);
}

/** https://tc39.es/ecma262/#sec-istypedarrayoutofbounds */
export function IsTypedArrayOutOfBounds(taRecord: TypedArrayWithBufferWitnessRecord) {
  const O = taRecord.Object;
  const bufferByteLength = taRecord.CachedBufferByteLength;
  Assert(
    (IsDetachedBuffer(O.ViewedArrayBuffer as ArrayBufferObject) === Value.true && bufferByteLength === 'detached')
    || (IsDetachedBuffer(O.ViewedArrayBuffer as ArrayBufferObject) === Value.false && bufferByteLength !== 'detached'),
  );
  if (bufferByteLength === 'detached') {
    return true;
  }
  const byteOffsetStart = O.ByteOffset;
  let byteOffsetEnd;
  if (O.ArrayLength === 'auto') {
    byteOffsetEnd = bufferByteLength;
  } else {
    const elementSize = TypedArrayElementSize(O);
    byteOffsetEnd = byteOffsetStart + O.ArrayLength * elementSize;
  }
  if (byteOffsetStart > bufferByteLength || byteOffsetEnd > bufferByteLength) {
    return true;
  }
  return false;
}

/** https://tc39.es/ecma262/#sec-istypedarrayfixedlength */
export function IsTypedArrayFixedLength(O: TypedArrayObject) {
  if (O.ArrayLength === 'auto') {
    return false;
  }
  const buffer = O.ViewedArrayBuffer as ArrayBufferObject;
  if (!IsFixedLengthArrayBuffer(buffer) && IsSharedArrayBuffer(buffer) === Value.false) {
    return false;
  }
  return true;
}

/** https://tc39.es/ecma262/#sec-isvalidintegerindex */
export function IsValidIntegerIndex(O: TypedArrayObject, index: NumberValue) {
  if (IsDetachedBuffer(O.ViewedArrayBuffer as ArrayBufferObject) === Value.true) {
    return Value.false;
  }
  if (IsIntegralNumber(index) === Value.false) {
    return Value.false;
  }
  const index_ = R(index);
  if (Object.is(index_, -0) || index_ < 0) {
    return Value.false;
  }
  const taRecord = MakeTypedArrayWithBufferWitnessRecord(O, 'seq-cst');
  if (IsTypedArrayOutOfBounds(taRecord)) {
    return Value.false;
  }
  const length = TypedArrayLength(taRecord);
  if (index_ >= length) {
    return Value.false;
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-typedarraygetelement */
export function TypedArrayGetElement(O: TypedArrayObject, index: NumberValue) {
  if (IsValidIntegerIndex(O, index) === Value.false) {
    return Value.undefined;
  }
  const offset = O.ByteOffset;
  const elementSize = TypedArrayElementSize(O);
  const byteIndexInBuffer = (R(index) * elementSize) + offset;
  const elementType = TypedArrayElementType(O);
  return GetValueFromBuffer(O.ViewedArrayBuffer as ArrayBufferObject, byteIndexInBuffer, elementType, true, 'unordered');
}

/** https://tc39.es/ecma262/#sec-integerindexedelementset */
export function TypedArraySetElement(O: TypedArrayObject, index: NumberValue, value: Value): ExpressionCompletion<BooleanValue> {
  // 3. If O.[[ContentType]] is BigInt, let numValue be ? ToBigInt(value).
  // 4. Otherwise, let numValue be ? ToNumber(value).
  let numValue;
  if (O.ContentType === 'BigInt') {
    numValue = Q(ToBigInt(value));
  } else {
    numValue = Q(ToNumber(value));
  }
  if (IsValidIntegerIndex(O, index) === Value.true) {
    const offset = O.ByteOffset;
    const elementSize = TypedArrayElementSize(O);
    const byteIndexInBuffer = (R(index) * elementSize) + offset;
    const elementType = TypedArrayElementType(O);
    SetValueInBuffer(O.ViewedArrayBuffer as ArrayBufferObject, byteIndexInBuffer, elementType, numValue, true, 'unordered');
    return Value.true;
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-isarraybufferviewoutofbounds */
export function IsArrayBufferViewOutOfBounds(O: DataViewObject | TypedArrayObject) {
  if (isDataViewObject(O)) {
    const viewRecord = MakeDataViewWithBufferWitnessRecord(O, 'seq-cst');
    return IsViewOutOfBounds(viewRecord);
  }
  const taRecord = MakeTypedArrayWithBufferWitnessRecord(O, 'seq-cst');
  return IsTypedArrayOutOfBounds(taRecord);
}
