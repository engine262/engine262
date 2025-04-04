import {
  Q, X, type PlainCompletion,
} from '../completion.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import {
  BigIntValue,
  BooleanValue,
  JSStringValue,
  NullValue,
  NumberValue,
  ObjectValue,
  UndefinedValue,
  Value, wellKnownSymbols, type Arguments, type FunctionCallContext,
} from '../value.mts';
import {
  Assert,
  Call,
  Get,
  GetMethod,
  IsCallable,
  IsConstructor,
  IteratorToList,
  Set,
  LengthOfArrayLike,
  ToObject,
  ToString,
  F,
  Realm,
  type FunctionObject,
  GetIteratorFromMethod,
  AllocateArrayBuffer,
  Construct,
  GetPrototypeFromConstructor,
  isNonNegativeInteger,
  IsTypedArrayOutOfBounds,
  MakeTypedArrayWithBufferWitnessRecord,
  R,
  RequireInternalSlot,
  SpeciesConstructor,
  ToBigInt64,
  ToBigUint64,
  ToInt16,
  ToInt32,
  ToInt8,
  ToNumber,
  ToUint16,
  ToUint32,
  ToUint8,
  ToUint8Clamp,
  TypedArrayCreate,
  TypedArrayLength,
  type ArrayBufferObject,
  type ExoticObject,
  type Intrinsics,
  type TypedArrayWithBufferWitnessRecord,
  CloneArrayBuffer,
  GetValueFromBuffer,
  SetValueInBuffer,
  ToIndex,
  IsFixedLengthArrayBuffer,
  IsDetachedBuffer,
  ArrayBufferByteLength,
} from '../abstract-ops/all.mts';
import { type Mutable, __ts_cast__ } from '../helpers.mts';
import type { PlainEvaluator, ValueEvaluator } from '../evaluator.mts';
import { bootstrapConstructor } from './bootstrap.mts';

export const typedArrayInfoByName = {
  Int8Array: {
    IntrinsicName: '%Int8Array%',
    ElementType: 'Int8',
    ElementSize: 1,
    ConversionOperation: ToInt8,
  },
  Uint8Array: {
    IntrinsicName: '%Uint8Array%',
    ElementType: 'Uint8',
    ElementSize: 1,
    ConversionOperation: ToUint8,
  },
  Uint8ClampedArray: {
    IntrinsicName: '%Uint8ClampedArray%',
    ElementType: 'Uint8C',
    ElementSize: 1,
    ConversionOperation: ToUint8Clamp,
  },
  Int16Array: {
    IntrinsicName: '%Int16Array%',
    ElementType: 'Int16',
    ElementSize: 2,
    ConversionOperation: ToInt16,
  },
  Uint16Array: {
    IntrinsicName: '%Uint16Array%',
    ElementType: 'Uint16',
    ElementSize: 2,
    ConversionOperation: ToUint16,
  },
  Int32Array: {
    IntrinsicName: '%Int32Array%',
    ElementType: 'Int32',
    ElementSize: 4,
    ConversionOperation: ToInt32,
  },
  Uint32Array: {
    IntrinsicName: '%Uint32Array%',
    ElementType: 'Uint32',
    ElementSize: 4,
    ConversionOperation: ToUint32,
  },
  BigInt64Array: {
    IntrinsicName: '%BigInt64Array%',
    ElementType: 'BigInt64',
    ElementSize: 8,
    ConversionOperation: ToBigInt64,
  },
  BigUint64Array: {
    IntrinsicName: '%BigUint64Array%',
    ElementType: 'BigUint64',
    ElementSize: 8,
    ConversionOperation: ToBigUint64,
  },
  Float32Array: {
    IntrinsicName: '%Float32Array%',
    ElementType: 'Float32',
    ElementSize: 4,
    ConversionOperation: undefined,
  },
  Float64Array: {
    IntrinsicName: '%Float64Array%',
    ElementType: 'Float64',
    ElementSize: 8,
    ConversionOperation: undefined,
  },
} as const;
export type TypedArrayConstructorNames = keyof typeof typedArrayInfoByName;

export const typedArrayInfoByType = {
  Int8: typedArrayInfoByName.Int8Array,
  Uint8: typedArrayInfoByName.Uint8Array,
  Uint8C: typedArrayInfoByName.Uint8ClampedArray,
  Int16: typedArrayInfoByName.Int16Array,
  Uint16: typedArrayInfoByName.Uint16Array,
  Int32: typedArrayInfoByName.Int32Array,
  Uint32: typedArrayInfoByName.Uint32Array,
  BigInt64: typedArrayInfoByName.BigInt64Array,
  BigUint64: typedArrayInfoByName.BigUint64Array,
  Float32: typedArrayInfoByName.Float32Array,
  Float64: typedArrayInfoByName.Float64Array,
} as const;
export type TypedArrayTypes = keyof typeof typedArrayInfoByType;

export interface TypedArrayObject extends ExoticObject {
  readonly Prototype: ObjectValue | NullValue;
  readonly Extensible: BooleanValue<false>;

  ViewedArrayBuffer: ArrayBufferObject | UndefinedValue;
  readonly ArrayLength: number | 'auto';
  readonly ByteOffset: number;
  readonly ContentType: 'BigInt' | 'Number';
  readonly TypedArrayName: JSStringValue;
  readonly ByteLength: number | 'auto';
}
export function isTypedArrayObject(value: Value): value is TypedArrayObject {
  return 'TypedArrayName' in value;
}

/** https://tc39.es/ecma262/#typedarray-species-create */
export function* TypedArraySpeciesCreate(exemplar: TypedArrayObject, argumentList: Arguments): ValueEvaluator<TypedArrayObject> {
  // 1. Assert: exemplar is an Object that has [[TypedArrayName]] and [[ContentType]] internal slots.
  Assert(exemplar instanceof ObjectValue
    && 'TypedArrayName' in exemplar
    && 'ContentType' in exemplar);
  // 2. Let defaultConstructor be the intrinsic object listed in column one of Table 61 for exemplar.[[TypedArrayName]].
  const defaultConstructor = surroundingAgent.intrinsic(typedArrayInfoByName[exemplar.TypedArrayName.stringValue() as TypedArrayConstructorNames].IntrinsicName);
  // 3. Let constructor be ? SpeciesConstructor(exemplar, defaultConstructor).
  const constructor = Q(yield* SpeciesConstructor(exemplar, defaultConstructor));
  // 4. Let result be ? TypedArrayCreate(constructor, argumentList).
  const result = Q(yield* TypedArrayCreateFromConstructor(constructor, argumentList));
  // 5. Assert: result has [[TypedArrayName]] and [[ContentType]] internal slots.
  Assert('TypedArrayName' in result && 'ContentType' in result);
  // 6. If result.[[ContentType]] is not equal to exemplar.[[ContentType]], throw a TypeError exception.
  if (result.ContentType !== exemplar.ContentType) {
    return surroundingAgent.Throw('TypeError', 'BufferContentTypeMismatch');
  }
  // 7. Return result.
  return result;
}

/** https://tc39.es/ecma262/#sec-typedarraycreatefromconstructor */
export function* TypedArrayCreateFromConstructor(constructor: FunctionObject, argumentList: Arguments): ValueEvaluator<TypedArrayObject> {
  const newTypedArray = Q(yield* Construct(constructor, argumentList)) as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(newTypedArray, 'seq-cst'));
  if (argumentList.length === 1 && argumentList[0] instanceof NumberValue) {
    if (IsTypedArrayOutOfBounds(taRecord)) {
      // TODO: error message
      return surroundingAgent.Throw('TypeError', 'Raw', 'TypedArrayCreateFromConstructor:IsTypedArrayOutOfBounds');
    }
    const length = TypedArrayLength(taRecord);
    if (length < R(argumentList[0])) {
      return surroundingAgent.Throw('TypeError', 'TypedArrayTooSmall');
    }
  }
  return newTypedArray;
}

/** https://tc39.es/ecma262/#sec-typedarray-create-same-type */
export function* TypedArrayCreateSameType(exemplar: TypedArrayObject, argumentList: Arguments): ValueEvaluator<TypedArrayObject> {
  const constructor = surroundingAgent.intrinsic(typedArrayInfoByName[exemplar.TypedArrayName.stringValue() as TypedArrayConstructorNames].IntrinsicName);
  const result = Q(yield* TypedArrayCreateFromConstructor(constructor, argumentList)) as TypedArrayObject;
  Assert('TypedArrayName' in result && 'ContentType' in result);
  Assert(result.ContentType === exemplar.ContentType);
  return result;
}

/** https://tc39.es/ecma262/#sec-validatetypedarray */
export function ValidateTypedArray(O: Value, order: 'seq-cst' | 'unordered'): PlainCompletion<TypedArrayWithBufferWitnessRecord> {
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in O);
  const taRecord = MakeTypedArrayWithBufferWitnessRecord(O as TypedArrayObject, order);
  if (IsTypedArrayOutOfBounds(taRecord)) {
    return surroundingAgent.Throw('TypeError', 'TypedArrayOutOfBounds');
  }
  return taRecord;
}

/** https://tc39.es/ecma262/#sec-typedarrayelementsize */
export function TypedArrayElementSize(O: TypedArrayObject): number {
  const type = O.TypedArrayName.stringValue() as TypedArrayConstructorNames;
  return typedArrayInfoByName[type].ElementSize;
}

/** https://tc39.es/ecma262/#sec-typedarrayelementtype */
export function TypedArrayElementType(O: TypedArrayObject): TypedArrayTypes {
  const type = O.TypedArrayName.stringValue() as TypedArrayConstructorNames;
  return typedArrayInfoByName[type].ElementType;
}

/** https://tc39.es/ecma262/#sec-comparetypedarrayelements */
export function* CompareTypedArrayElements(x: NumberValue | BigIntValue, y: NumberValue | BigIntValue, comparator: FunctionObject | UndefinedValue): ValueEvaluator<NumberValue> {
  Assert(
    (x instanceof NumberValue && y instanceof NumberValue)
    || (x instanceof BigIntValue && y instanceof BigIntValue),
  );
  if (!(comparator instanceof UndefinedValue)) {
    const v = Q(yield* ToNumber(Q(yield* Call(comparator, Value.undefined, [x, y]))));
    if (v.isNaN()) {
      return F(0);
    }
    return v;
  }
  if (x.isNaN() && y.isNaN()) {
    return F(0);
  }
  if (x.isNaN()) {
    return F(1);
  }
  if (y.isNaN()) {
    return F(-1);
  }
  if (x.value < y.value) {
    return F(-1);
  }
  if (x.value > y.value) {
    return F(1);
  }
  if (Object.is(-0, x.value) && Object.is(0, y.value)) {
    return F(-1);
  }
  if (Object.is(0, x.value) && Object.is(-0, y.value)) {
    return F(1);
  }
  return F(0);
}

/** https://tc39.es/ecma262/#sec-%typedarray%-intrinsic-object */
function TypedArrayConstructor(this: unknown) {
  // 1. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'NotAConstructor', this);
}

/** https://tc39.es/ecma262/#sec-allocatetypedarray */
export function* AllocateTypedArray(constructorName: JSStringValue, newTarget: FunctionObject, defaultProto: keyof Intrinsics, length?: number): ValueEvaluator<Mutable<TypedArrayObject>> {
  // 1. Let proto be ? GetPrototypeFromConstructor(newTarget, defaultProto).
  const proto = Q(yield* GetPrototypeFromConstructor(newTarget, defaultProto));
  // 2. Let obj be TypedArrayCreate(proto).
  const obj = TypedArrayCreate(proto) as Mutable<TypedArrayObject>;
  // 3. Assert: obj.[[ViewedArrayBuffer]] is undefined.
  Assert(obj.ViewedArrayBuffer === Value.undefined);
  // 4. Set obj.[[TypedArrayName]] to constructorName.
  obj.TypedArrayName = constructorName;
  // 5. If constructorName is "BigInt64Array" or "BigUint64Array", set obj.[[ContentType]] to BigInt.
  // 6. Otherwise, set obj.[[ContentType]] to Number.
  if (constructorName.stringValue() === 'BigInt64Array' || constructorName.stringValue() === 'BigUint64Array') {
    obj.ContentType = 'BigInt';
  } else {
    obj.ContentType = 'Number';
  }
  // 7. If length is not present, then
  if (length === undefined) {
    // 1. Set obj.[[ByteLength]] to 0.
    obj.ByteLength = 0;
    // 1. Set obj.[[ByteOffset]] to 0.
    obj.ByteOffset = 0;
    // 1. Set obj.[[ArrayLength]] to 0.
    obj.ArrayLength = 0;
  } else {
    // a. Perform ? AllocateTypedArrayBuffer(obj, length).
    Q(yield* AllocateTypedArrayBuffer(obj, length));
  }
  // 9. Return obj.
  return obj;
}

/** https://tc39.es/ecma262/#sec-initializetypedarrayfromtypedarray */
export function* InitializeTypedArrayFromTypedArray(O: Mutable<TypedArrayObject>, srcArray: TypedArrayObject): PlainEvaluator {
  const srcData = srcArray.ViewedArrayBuffer as ArrayBufferObject;
  const elementType = TypedArrayElementType(O);
  const elementSize = TypedArrayElementSize(O);
  const srcType = TypedArrayElementType(srcArray);
  const srcElementSize = TypedArrayElementSize(srcArray);
  const srcByteOffset = srcArray.ByteOffset;
  const srcRecord = MakeTypedArrayWithBufferWitnessRecord(srcArray, 'seq-cst');
  if (IsTypedArrayOutOfBounds(srcRecord)) {
    return surroundingAgent.Throw('TypeError', 'TypedArrayOutOfBounds');
  }
  const elementLength = TypedArrayLength(srcRecord);
  const byteLength = elementSize * elementLength;
  let data;
  if (elementType === srcType) {
    data = Q(yield* CloneArrayBuffer(srcData, srcByteOffset, byteLength));
  } else {
    data = Q(yield* AllocateArrayBuffer(surroundingAgent.intrinsic('%ArrayBuffer%'), byteLength));
    if (srcArray.ContentType !== O.ContentType) {
      return surroundingAgent.Throw('TypeError', 'BufferContentTypeMismatch');
    }
    let srcByteIndex = srcByteOffset;
    let targetByteIndex = 0;
    let count = elementLength;
    while (count > 0) {
      const value = GetValueFromBuffer(srcData, srcByteIndex, srcType, true, 'unordered');
      Q(yield* SetValueInBuffer(data, targetByteIndex, elementType, value, true, 'unordered'));
      srcByteIndex += srcElementSize;
      targetByteIndex += elementSize;
      count -= 1;
    }
  }
  O.ViewedArrayBuffer = data;
  O.ByteLength = byteLength;
  O.ByteOffset = 0;
  O.ArrayLength = elementLength;
}

/** https://tc39.es/ecma262/#sec-initializetypedarrayfromarraybuffer */
export function* InitializeTypedArrayFromArrayBuffer(O: Mutable<TypedArrayObject>, buffer: ArrayBufferObject, byteOffset: Value, length: Value): PlainEvaluator {
  const elementSize = TypedArrayElementSize(O);
  const offset = Q(yield* ToIndex(byteOffset));
  if (offset % elementSize !== 0) {
    return surroundingAgent.Throw('RangeError', 'TypedArrayOffsetAlignment', offset, elementSize);
  }
  const bufferIsFixedLength = IsFixedLengthArrayBuffer(buffer);
  let newLength;
  if (length !== Value.undefined) {
    newLength = Q(yield* ToIndex(length));
  }
  if (IsDetachedBuffer(buffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  const bufferByteLength = ArrayBufferByteLength(buffer, 'seq-cst');
  if (length === Value.undefined && !bufferIsFixedLength) {
    if (offset > bufferByteLength) {
      return surroundingAgent.Throw('RangeError', 'TypedArrayCreationOOB');
    }
    O.ByteLength = 'auto';
    O.ArrayLength = 'auto';
  } else {
    let newByteLength;
    if (length === Value.undefined) {
      if (bufferByteLength % elementSize !== 0) {
        return surroundingAgent.Throw('RangeError', 'TypedArrayLengthAlignment', bufferByteLength, elementSize);
      }
      newByteLength = bufferByteLength - offset;
      if (newByteLength < 0) {
        return surroundingAgent.Throw('RangeError', 'TypedArrayCreationOOB');
      }
    } else {
      Assert(newLength !== undefined);
      newByteLength = newLength * elementSize;
      if (offset + newByteLength > bufferByteLength) {
        return surroundingAgent.Throw('RangeError', 'TypedArrayCreationOOB');
      }
    }
    O.ByteLength = newByteLength;
    O.ArrayLength = newByteLength / elementSize;
  }
  O.ViewedArrayBuffer = buffer;
  O.ByteOffset = offset;
}

/** https://tc39.es/ecma262/#sec-initializetypedarrayfromlist */
export function* InitializeTypedArrayFromList(O: Mutable<TypedArrayObject>, value: Value[]): PlainEvaluator {
  const len = value.length;
  Q(yield* AllocateTypedArrayBuffer(O, len));
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(F(k)));
    const kValue = value.shift()!;
    Q(yield* Set(O, Pk, kValue, Value.true));
    k += 1;
  }
  Assert(value.length === 0);
}

/** https://tc39.es/ecma262/#sec-initializetypedarrayfromarraylike */
export function* InitializeTypedArrayFromArrayLike(O: Mutable<TypedArrayObject>, arrayLike: ObjectValue): PlainEvaluator {
  const len = Q(yield* LengthOfArrayLike(arrayLike));
  Q(yield* AllocateTypedArrayBuffer(O, len));
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(F(k)));
    const kValue = Q(yield* Get(arrayLike, Pk));
    Q(yield* Set(O, Pk, kValue, Value.true));
    k += 1;
  }
}

/** https://tc39.es/ecma262/#sec-allocatetypedarraybuffer */
export function* AllocateTypedArrayBuffer(O: TypedArrayObject, length: number): ValueEvaluator<TypedArrayObject> {
  // 1. Assert: O is an Object that has a [[ViewedArrayBuffer]] internal slot.
  Assert(O instanceof ObjectValue && 'ViewedArrayBuffer' in O);
  // 2. Assert: O.[[ViewedArrayBuffer]] is undefined.
  Assert(O.ViewedArrayBuffer === Value.undefined);
  // 3. Assert: length is a non-negative integer.
  Assert(isNonNegativeInteger(length));
  // 4. Let constructorName be the String value of O.[[TypedArrayName]].
  const constructorName = O.TypedArrayName.stringValue() as TypedArrayConstructorNames;
  // 5. Let elementSize be the Element Size value specified in Table 61 for constructorName.
  const elementSize = typedArrayInfoByName[constructorName].ElementSize;
  // 6. Let byteLength be elementSize × length.
  const byteLength = elementSize * length;
  // 7. Let data be ? AllocateArrayBuffer(%ArrayBuffer%, byteLength).
  const data = Q(yield* AllocateArrayBuffer(surroundingAgent.intrinsic('%ArrayBuffer%'), byteLength));
  // 8. Set O.[[ViewedArrayBuffer]] to data.
  O.ViewedArrayBuffer = data;
  // 9. Set O.[[ByteLength]] to byteLength.
  __ts_cast__<Mutable<TypedArrayObject>>(O);
  O.ByteLength = byteLength;
  // 10. Set O.[[ByteOffset]] to 0.
  O.ByteOffset = 0;
  // 11. Set O.[[ArrayLength]] to length.
  O.ArrayLength = length;
  // 12. Return O.
  return O;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.from */
function* TypedArray_from([source = Value.undefined, mapper = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let C be the this value.
  const C = thisValue;
  // 2. If IsConstructor(C) is false, throw a TypeError exception.
  if (IsConstructor(C) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', C);
  }
  // 3. If mapfn is undefined, let mapping be false.
  let mapping;
  if (mapper === Value.undefined) {
    mapping = false;
  } else {
    // a. If IsCallable(mapfn) is false, throw a TypeError exception.
    if (IsCallable(mapper) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', mapper);
    }
    // b. Let mapping be true.
    mapping = true;
  }
  // 5. Let usingIterator be ? GetMethod(source, @@iterator).
  const usingIterator = Q(yield* GetMethod(source, wellKnownSymbols.iterator));
  // 6. If usingIterator is not undefined, then
  if (!(usingIterator instanceof UndefinedValue)) {
    const values = Q(yield* IteratorToList(Q(yield* GetIteratorFromMethod(source, usingIterator))));
    const len = values.length;
    const targetObj = Q(yield* TypedArrayCreateFromConstructor(C as FunctionObject, [F(len)]));
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(F(k)));
      const kValue = values.shift()!;
      let mappedValue;
      if (mapping) {
        mappedValue = Q(yield* Call(mapper, thisArg, [kValue, F(k)]));
      } else {
        mappedValue = kValue;
      }
      Q(yield* Set(targetObj, Pk, mappedValue, Value.true));
      k += 1;
    }
    Assert(values.length === 0);
    return targetObj;
  }
  // 7. NOTE: source is not an Iterable so assume it is already an array-like object.
  // 8. Let arrayLike be ! ToObject(source).
  const arrayLike = X(ToObject(source));
  // 9. Let len be ? LengthOfArrayLike(arrayLike).
  const len = Q(yield* LengthOfArrayLike(arrayLike));
  // 10. Let targetObj be ? TypedArrayCreate(C, « 𝔽(len) »).
  const targetObj = Q(yield* TypedArrayCreateFromConstructor(C as FunctionObject, [F(len)]));
  // 11. Let k be 0.
  let k = 0;
  // 12. Repeat, while k < len
  while (k < len) {
    // a. Let Pk be ! ToString(𝔽(k)).
    const Pk = X(ToString(F(k)));
    // b. Let kValue be ? Get(arrayLike, Pk).
    const kValue = Q(yield* Get(arrayLike, Pk));
    let mappedValue;
    // c. If mapping is true, then
    if (mapping) {
      // i. Let mappedValue be ? Call(mapfn, thisArg, « kValue, 𝔽(k) »).
      mappedValue = Q(yield* Call(mapper, thisArg, [kValue, F(k)]));
    } else {
      // d. Else, let mappedValue be kValue.
      mappedValue = kValue;
    }
    // e. Perform ? Set(targetObj, Pk, mappedValue, true).
    Q(yield* Set(targetObj, Pk, mappedValue, Value.true));
    // f. Set k to k + 1.
    k += 1;
  }
  // 13. Return targetObj.
  return targetObj;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.of */
function* TypedArray_of(items: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let len be the actual number of arguments passed to this function.
  // 2. Let items be the List of arguments passed to this function.
  const len = items.length;
  // 3. Let C be the this value.
  const C = thisValue;
  // 4. If IsConstructor(C) is false, throw a TypeError exception.
  if (IsConstructor(C) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', C);
  }
  // 5. Let newObj be ? TypedArrayCreate(C, « 𝔽(len) »).
  const newObj = Q(yield* TypedArrayCreateFromConstructor(C as FunctionObject, [F(len)]));
  // 6. Let k be 0.
  let k = 0;
  // 7. Repeat, while k < len
  while (k < len) {
    // a. Let kValue be items[k].
    const kValue = items[k];
    // b. Let Pk be ! ToString(𝔽(k)).
    const Pk = X(ToString(F(k)));
    // c. Perform ? Set(newObj, Pk, kValue, true).
    Q(yield* Set(newObj, Pk, kValue, Value.true));
    // d. Set k to k + 1.
    k += 1;
  }
  // 8. Return newObj.
  return newObj;
}

/** https://tc39.es/ecma262/#sec-get-%typedarray%-@@species */
function TypedArray_speciesGetter(_args: Arguments, { thisValue }: FunctionCallContext) {
  return thisValue;
}

export function bootstrapTypedArray(realmRec: Realm) {
  const typedArrayConstructor = bootstrapConstructor(realmRec, TypedArrayConstructor, 'TypedArray', 0, realmRec.Intrinsics['%TypedArray.prototype%'], [
    ['from', TypedArray_from, 1],
    ['of', TypedArray_of, 0],
    [wellKnownSymbols.species, [TypedArray_speciesGetter]],
  ]);

  realmRec.Intrinsics['%TypedArray%'] = typedArrayConstructor;
}
