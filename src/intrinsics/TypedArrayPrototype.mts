import {
  Q, X, type ValueEvaluator,
  type ValueCompletion,
} from '../completion.mts';
import {
  BigIntValue,
  Descriptor, NumberValue, ObjectValue, Value, wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import { __ts_cast__ } from '../utils/language.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import { FindViaPredicate, SortIndexedProperties } from './ArrayPrototype.mts';
import {
  CompareTypedArrayElements,
  TypedArrayCreateSameType,
  TypedArrayElementSize,
  TypedArrayElementType,
  TypedArraySpeciesCreate, ValidateTypedArray, ValidateTypedArrayBounds, type TypedArrayObject,
} from './TypedArray.mts';
import {
  Assert,
  Call,
  CloneArrayBuffer,
  CreateArrayIterator,
  Get,
  GetValueFromBuffer,
  HasProperty,
  Invoke,
  TypedArraySetElement,
  IsCallable,
  IsSharedArrayBuffer,
  IsStrictlyEqual,
  SameValue,
  SameValueZero,
  SetValueInBuffer,
  LengthOfArrayLike,
  ToBoolean,
  ToAbsoluteIndex,
  ToClampedIndex,
  ToBigInt,
  ToIntegerOrInfinity,
  ToNumber,
  ToObject,
  ToString,
  RequireInternalSlot,
  F,
  Realm,
  type ArrayBufferObject,
  MakeTypedArrayWithBufferWitnessRecord,
  TypedArrayByteLength,
  IsTypedArrayOutOfBounds,
  TypedArrayLength,
  IsValidIntegerIndex,
  Throw,
  TypedArrayGetElement,
} from '#self';

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.at */
function* TypedArrayProto_at([index = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  const k = Q(yield* ToAbsoluteIndex(index, length));
  if (k < 0 || k >= length) {
    return Value.undefined;
  }
  return TypedArrayGetElement(obj, F(k));
}

/** https://tc39.es/ecma262/#sec-get-%typedarray%.prototype.buffer */
function TypedArrayProto_buffer(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = thisValue as TypedArrayObject;
  Q(RequireInternalSlot(obj, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in obj);
  const buffer = obj.ViewedArrayBuffer;
  return buffer || Value.undefined;
}

/** https://tc39.es/ecma262/#sec-get-%typedarray%.prototype.bytelength */
function TypedArrayProto_byteLength(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = thisValue as TypedArrayObject;
  Q(RequireInternalSlot(obj, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in obj);
  const taRecord = MakeTypedArrayWithBufferWitnessRecord(obj, 'seq-cst');
  if (IsTypedArrayOutOfBounds(taRecord)) {
    return F(0);
  }
  const size = TypedArrayByteLength(taRecord);
  return F(size);
}

/** https://tc39.es/ecma262/#sec-get-%typedarray%.prototype.byteoffset */
function TypedArrayProto_byteOffset(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = thisValue as TypedArrayObject;
  Q(RequireInternalSlot(obj, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in obj);
  const taRecord = MakeTypedArrayWithBufferWitnessRecord(obj, 'seq-cst');
  if (IsTypedArrayOutOfBounds(taRecord)) {
    return F(0);
  }
  const offset = obj.ByteOffset;
  return F(offset);
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.copywithin */
function* TypedArrayProto_copyWithin([target = Value.undefined, start = Value.undefined, end = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  let taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  let length = TypedArrayLength(taRecord);
  const targetIndex = Q(yield* ToClampedIndex(target, length));
  const startIndex = Q(yield* ToClampedIndex(start, length));
  const endIndex = end === Value.undefined ? length : Q(yield* ToClampedIndex(end, length));
  let count = Math.min(endIndex - startIndex, length - targetIndex);
  if (count > 0) {
    const buffer = obj.ViewedArrayBuffer as ArrayBufferObject;
    taRecord = Q(ValidateTypedArrayBounds(obj, 'seq-cst'));
    length = TypedArrayLength(taRecord);
    count = Math.min(count, length - startIndex, length - targetIndex);
    const elementSize = TypedArrayElementSize(obj);
    const byteOffset = obj.ByteOffset;
    let toByteIndex = (targetIndex * elementSize) + byteOffset;
    let fromByteIndex = (startIndex * elementSize) + byteOffset;
    let countBytes = count * elementSize;
    let direction;
    if (fromByteIndex < toByteIndex && toByteIndex < fromByteIndex + countBytes) {
      direction = -1;
      fromByteIndex = fromByteIndex + countBytes - 1;
      toByteIndex = toByteIndex + countBytes - 1;
    } else {
      direction = 1;
    }
    while (countBytes > 0) {
      Assert(fromByteIndex >= 0 && toByteIndex >= 0);
      const value = GetValueFromBuffer(buffer, fromByteIndex, 'Uint8', true, 'unordered');
      Q(yield* SetValueInBuffer(buffer, toByteIndex, 'Uint8', value, true, 'unordered'));
      fromByteIndex += direction;
      toByteIndex += direction;
      countBytes -= 1;
    }
  }
  return obj;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.entries */
function TypedArrayProto_entries(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = thisValue as TypedArrayObject;
  Q(ValidateTypedArray(obj, 'seq-cst'));
  return CreateArrayIterator(obj, 'key+value');
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.every */
function* TypedArrayProto_every([callbackFn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  if (!IsCallable(callbackFn)) {
    return Throw.TypeError('$1 is not a function', callbackFn);
  }
  let k = 0;
  while (k < length) {
    const kValue = TypedArrayGetElement(obj, F(k));
    const testResult = ToBoolean(Q(yield* Call(callbackFn, thisArg, [kValue, F(k), obj])));
    if (!testResult) return Value.false;
    k += 1;
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.fill */
function* TypedArrayProto_fill([value = Value.undefined, start = Value.undefined, end = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  let taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  let length = TypedArrayLength(taRecord);
  if (obj.ContentType === 'BigInt') {
    value = Q(yield* ToBigInt(value));
  } else {
    value = Q(yield* ToNumber(value));
  }
  const startIndex = Q(yield* ToClampedIndex(start, length));
  let endIndex = end === Value.undefined ? length : Q(yield* ToClampedIndex(end, length));
  taRecord = Q(ValidateTypedArrayBounds(obj, 'seq-cst'));
  length = TypedArrayLength(taRecord);
  endIndex = Math.min(endIndex, length);
  let k = startIndex;
  while (k < endIndex) {
    X(TypedArraySetElement(obj, F(k), value));
    k += 1;
  }
  return obj;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.filter */
function* TypedArrayProto_filter([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  if (!IsCallable(callbackfn)) {
    return Throw.TypeError('callbackfn ($1) is not a function', callbackfn);
  }
  const kept = [];
  let captured = 0;
  let k = 0;
  while (k < length) {
    const kValue = TypedArrayGetElement(obj, F(k));
    const selected = ToBoolean(Q(yield* Call(callbackfn, thisArg, [kValue, F(k), obj])));
    if (selected) {
      kept.push(kValue);
      captured += 1;
    }
    k += 1;
  }
  const result = Q(yield* TypedArraySpeciesCreate(obj, [F(captured)]));
  let n = 0;
  for (const element of kept) {
    X(TypedArraySetElement(result, F(n), element));
    n += 1;
  }
  return result;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.find */
function* TypedArrayProto_find([predicate = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  const findRecord = Q(yield* FindViaPredicate(obj, BigInt(length), 'ascending', predicate, thisArg));
  return findRecord.Value;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.findindex */
function* TypedArrayProto_findIndex([predicate = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  const findRecord = Q(yield* FindViaPredicate(obj, BigInt(length), 'ascending', predicate, thisArg));
  return findRecord.Index;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.findlast */
function* TypedArrayProto_findLast([predicate = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  const findRecord = Q(yield* FindViaPredicate(obj, BigInt(length), 'descending', predicate, thisArg));
  return findRecord.Value;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.findlastindex */
function* TypedArrayProto_findLastIndex([predicate = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  const findRecord = Q(yield* FindViaPredicate(obj, BigInt(length), 'descending', predicate, thisArg));
  return findRecord.Index;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.foreach */
function* TypedArrayProto_forEach([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  if (!IsCallable(callbackfn)) return Throw.TypeError('$1 is not a function', callbackfn);
  let k = 0;
  while (k < length) {
    const kValue = TypedArrayGetElement(obj, F(k));
    Q(yield* Call(callbackfn, thisArg, [kValue, F(k), obj]));
    k += 1;
  }
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.includes */
function* TypedArrayProto_includes([searchElement = Value.undefined, fromIndex = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  if (length === 0) return Value.false;
  let k = Q(yield* ToClampedIndex(fromIndex, length));
  while (k < length) {
    const elementK = TypedArrayGetElement(obj, F(k));
    if (SameValueZero(searchElement, elementK)) return Value.true;
    k += 1;
  }
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.indexof */
function* TypedArrayProto_indexOf([searchElement = Value.undefined, fromIndex = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  if (length === 0) {
    return F(-1);
  }
  let k = Q(yield* ToClampedIndex(fromIndex, length));
  while (k < length) {
    const propertyKey = X(ToString(F(k)));
    const kPresent = X(HasProperty(obj, propertyKey));
    if (kPresent) {
      const elementK = TypedArrayGetElement(obj, F(k));
      if (IsStrictlyEqual(searchElement, elementK)) return F(k);
    }
    k += 1;
  }
  return F(-1);
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.join */
function* TypedArrayProto_join([separator = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  let separatorString: string;
  if (separator === Value.undefined) separatorString = ',';
  else separatorString = Q(yield* ToString(separator));
  let result = '';
  let k = 0;
  while (k < length) {
    if (k > 0) result = `${result}${separatorString}`;
    const element = TypedArrayGetElement(obj, F(k));
    if (element !== Value.undefined) {
      const elementString = X(ToString(element));
      result += elementString;
    }
    k += 1;
  }
  return Value(result);
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.keys */
function TypedArrayProto_keys(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = thisValue as TypedArrayObject;
  Q(ValidateTypedArray(obj, 'seq-cst'));
  return CreateArrayIterator(obj, 'key');
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.lastindexof */
function* TypedArrayProto_lastIndexOf([searchElement = Value.undefined, fromIndex]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  if (length === 0) return F(-1);
  let k: number;
  if (fromIndex === undefined) {
    k = length - 1;
  } else {
    k = Math.min(Q(yield* ToAbsoluteIndex(fromIndex, length)), length - 1);
  }
  while (k >= 0) {
    const propertyKey = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, propertyKey));
    if (kPresent) {
      const elementK = TypedArrayGetElement(obj, F(k));
      if (IsStrictlyEqual(searchElement, elementK)) return F(k);
    }
    k -= 1;
  }
  return F(-1);
}

/** https://tc39.es/ecma262/#sec-get-%typedarray%.prototype.length */
function TypedArrayProto_length(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = thisValue as TypedArrayObject;
  Q(RequireInternalSlot(obj, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in obj);
  const taRecord = MakeTypedArrayWithBufferWitnessRecord(obj, 'seq-cst');
  if (IsTypedArrayOutOfBounds(taRecord)) {
    return F(0);
  }
  const length = TypedArrayLength(taRecord);
  return F(length);
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.map */
function* TypedArrayProto_map([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  if (!IsCallable(callbackfn)) {
    return Throw.TypeError('callbackfn ($1) is not a function', callbackfn);
  }
  const result = Q(yield* TypedArraySpeciesCreate(obj, [F(length)]));
  let k = 0;
  while (k < length) {
    const kValue = TypedArrayGetElement(obj, F(k));
    const mappedValue = Q(yield* Call(callbackfn, thisArg, [kValue, F(k), obj]));
    Q(yield* TypedArraySetElement(result, F(k), mappedValue));
    k += 1;
  }
  return result;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.reduce */
function* TypedArrayProto_reduce([callbackfn = Value.undefined, initialValue]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  if (!IsCallable(callbackfn)) return Throw.TypeError('$1 is not a function', callbackfn);
  if (length === 0 && initialValue === undefined) return Throw.TypeError('Cannot reduce an empty array with no initial value');
  let k = 0;
  let accumulator: Value = Value.undefined;
  if (initialValue !== undefined) {
    accumulator = initialValue;
  } else {
    accumulator = TypedArrayGetElement(obj, F(k));
    k += 1;
  }
  while (k < length) {
    const kValue = TypedArrayGetElement(obj, F(k));
    accumulator = Q(yield* Call(callbackfn, Value.undefined, [accumulator, kValue, F(k), obj]));
    k += 1;
  }
  return accumulator;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.reduceright */
function* TypedArrayProto_reduceRight([callbackfn = Value.undefined, initialValue]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  if (!IsCallable(callbackfn)) return Throw.TypeError('$1 is not a function', callbackfn);
  if (length === 0 && initialValue === undefined) return Throw.TypeError('Cannot reduce an empty array with no initial value');
  let k = length - 1;
  let accumulator: Value = Value.undefined;
  if (initialValue !== undefined) {
    accumulator = initialValue;
  } else {
    accumulator = TypedArrayGetElement(obj, F(k));
    k -= 1;
  }
  while (k >= 0) {
    const kValue = TypedArrayGetElement(obj, F(k));
    accumulator = Q(yield* Call(callbackfn, Value.undefined, [accumulator, kValue, F(k), obj]));
    k -= 1;
  }
  return accumulator;
}

/** https://tc39.es/ecma262/#sec-settypedarrayfromtypedarray */
function* SetTypedArrayFromTypedArray(target: TypedArrayObject, targetOffset: number, source: TypedArrayObject) {
  const targetBuffer = target.ViewedArrayBuffer as ArrayBufferObject;
  const targetRecord = Q(ValidateTypedArrayBounds(target, 'seq-cst'));
  const targetLength = TypedArrayLength(targetRecord);
  let srcBuffer = source.ViewedArrayBuffer as ArrayBufferObject;
  const srcRecord = Q(ValidateTypedArrayBounds(source, 'seq-cst'));
  const srcLength = TypedArrayLength(srcRecord);
  const targetType = TypedArrayElementType(target);
  const targetElementSize = TypedArrayElementSize(target);
  const targetByteOffset = target.ByteOffset;
  const srcType = TypedArrayElementType(source);
  const srcElementSize = TypedArrayElementSize(source);
  const srcByteOffset = source.ByteOffset;
  if (targetOffset === +Infinity) {
    return Throw.RangeError('TypedArray index out of bounds');
  }
  if (srcLength + targetOffset > targetLength) {
    return Throw.RangeError('TypedArray index out of bounds');
  }
  if (target.ContentType !== source.ContentType) {
    return Throw.TypeError('Newly created TypedArray did not match exemplar\'s content type');
  }
  let sameSharedArrayBuffer;
  if (IsSharedArrayBuffer(srcBuffer) && IsSharedArrayBuffer(targetBuffer) && srcBuffer.ArrayBufferData === targetBuffer.ArrayBufferData) {
    sameSharedArrayBuffer = true;
  } else {
    sameSharedArrayBuffer = false;
  }
  let srcByteIndex;
  if (SameValue(srcBuffer, targetBuffer) || sameSharedArrayBuffer) {
    const srcByteLength = TypedArrayByteLength(srcRecord);
    srcBuffer = Q(yield* CloneArrayBuffer(srcBuffer, srcByteOffset, srcByteLength));
    srcByteIndex = 0;
  } else {
    srcByteIndex = srcByteOffset;
  }
  let targetByteIndex = (targetOffset * targetElementSize) + targetByteOffset;
  const limit = targetByteIndex + (targetElementSize * srcLength);
  if (srcType === targetType) {
    while (targetByteIndex < limit) {
      const value = GetValueFromBuffer(srcBuffer, srcByteIndex, 'Uint8', true, 'unordered');
      Q(yield* SetValueInBuffer(targetBuffer, targetByteIndex, 'Uint8', value, true, 'unordered'));
      srcByteIndex += 1;
      targetByteIndex += 1;
    }
  } else {
    while (targetByteIndex < limit) {
      const value = GetValueFromBuffer(srcBuffer, srcByteIndex, srcType, true, 'unordered');
      Q(yield* SetValueInBuffer(targetBuffer, targetByteIndex, targetType, value, true, 'unordered'));
      srcByteIndex += srcElementSize;
      targetByteIndex += targetElementSize;
    }
  }
  return undefined;
}

/** https://tc39.es/ecma262/#sec-settypedarrayfromarraylike */
function* SetTypedArrayFromArrayLike(target: TypedArrayObject, targetOffset: number, source: Value) {
  const targetRecord = Q(ValidateTypedArrayBounds(target, 'seq-cst'));
  const targetLength = TypedArrayLength(targetRecord);
  const src = Q(ToObject(source));
  const srcLength = Q(yield* LengthOfArrayLike(src));
  if (targetOffset === +Infinity) {
    return Throw.RangeError('TypedArray index out of bounds');
  }
  if (srcLength + targetOffset > targetLength) {
    return Throw.RangeError('TypedArray index out of bounds');
  }
  let k = 0;
  while (k < srcLength) {
    const Pk = X(ToString(F(k)));
    const value = Q(yield* Get(src, Pk));
    const targetIndex = F(targetOffset + k);
    Q(yield* TypedArraySetElement(target, targetIndex, value));
    k += 1;
  }
  return undefined;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.reverse */
function* TypedArrayProto_reverse(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  const middle = Math.floor(length / 2);
  let lower = 0;
  while (lower !== middle) {
    const upper = length - lower - 1;
    const lowerValue = TypedArrayGetElement(obj, F(lower));
    const upperValue = TypedArrayGetElement(obj, F(upper));
    X(TypedArraySetElement(obj, F(lower), upperValue));
    X(TypedArraySetElement(obj, F(upper), lowerValue));
    lower += 1;
  }
  return obj;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.set-overloaded-offset */
function* TypedArrayProto_set([source = Value.undefined, offset = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let target be the this value.
  const target = thisValue as TypedArrayObject;
  // 2. Perform ? RequireInternalSlot(target, [[TypedArrayName]]).
  Q(RequireInternalSlot(target, 'TypedArrayName'));
  // 3. Assert: target has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in target);
  // 4. Let targetOffset be ? ToIntegerOrInfinity(offset).
  const targetOffset = Q(yield* ToIntegerOrInfinity(offset));
  // 5. If targetOffset < 0, throw a RangeError exception.
  if (targetOffset < 0) {
    return Throw.RangeError('targetOffset ($1) cannot be negative', targetOffset);
  }
  // 6. If source is an Object that has a [[TypedArrayName]] internal slot, then
  if (source instanceof ObjectValue && 'TypedArrayName' in source) {
    // a. Perform ? SetTypedArrayFromTypedArray(target, targetOffset, source).
    Q(yield* SetTypedArrayFromTypedArray(target, targetOffset, source as TypedArrayObject));
  } else { // 7. Else,
    // a. Perform ? SetTypedArrayFromArrayLike(target, targetOffset, source).
    Q(yield* SetTypedArrayFromArrayLike(target, targetOffset, source));
  }
  // 8. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.slice */
function* TypedArrayProto_slice([start = Value.undefined, end = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  let taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const sourceArrayLength = TypedArrayLength(taRecord);
  const startIndex = Q(yield* ToClampedIndex(start, sourceArrayLength));
  let endIndex = end === Value.undefined ? sourceArrayLength : Q(yield* ToClampedIndex(end, sourceArrayLength));
  let countBytes = Math.max(endIndex - startIndex, 0);
  const resultArray = Q(yield* TypedArraySpeciesCreate(obj, [F(countBytes)]));
  if (countBytes > 0) {
    taRecord = Q(ValidateTypedArrayBounds(obj, 'seq-cst'));
    endIndex = Math.min(endIndex, TypedArrayLength(taRecord));
    countBytes = Math.max(endIndex - startIndex, 0);
    const srcType = TypedArrayElementType(obj);
    const targetType = TypedArrayElementType(resultArray);
    if (srcType === targetType) {
      const srcBuffer = obj.ViewedArrayBuffer as ArrayBufferObject;
      const targetBuffer = resultArray.ViewedArrayBuffer as ArrayBufferObject;
      const elementSize = TypedArrayElementSize(obj);
      const srcByteOffset = obj.ByteOffset;
      let srcByteIndex = (startIndex * elementSize) + srcByteOffset;
      let targetByteIndex = resultArray.ByteOffset;
      const endByteIndex = targetByteIndex + (countBytes * elementSize);
      while (targetByteIndex < endByteIndex) {
        const value = GetValueFromBuffer(srcBuffer, srcByteIndex, 'Uint8', true, 'unordered');
        Q(yield* SetValueInBuffer(targetBuffer, targetByteIndex, 'Uint8', value, true, 'unordered'));
        srcByteIndex += 1;
        targetByteIndex += 1;
      }
    } else {
      let n = 0;
      let k = startIndex;
      while (k < endIndex) {
        const kValue = X(TypedArrayGetElement(obj, F(k)));
        X(TypedArraySetElement(resultArray, F(n), kValue));
        k += 1;
        n += 1;
      }
    }
  }
  return resultArray;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.some */
function* TypedArrayProto_some([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  if (!IsCallable(callbackfn)) return Throw.TypeError('$1 is not a function', callbackfn);
  let k = 0;
  while (k < length) {
    const kValue = TypedArrayGetElement(obj, F(k));
    const testResult = ToBoolean(Q(yield* Call(callbackfn, thisArg, [kValue, F(k), obj])));
    if (testResult) return Value.true;
    k += 1;
  }
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.sort */
function* TypedArrayProto_sort([comparator = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  if (comparator !== Value.undefined && !IsCallable(comparator)) {
    return Throw.TypeError('comparator ($1) is not a function', comparator);
  }
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const len = TypedArrayLength(taRecord);
  const SortCompare = function* SortCompare(x: Value, y: Value): ValueEvaluator<NumberValue> {
    Assert(x instanceof NumberValue || x instanceof BigIntValue);
    Assert(y instanceof NumberValue || y instanceof BigIntValue);
    return yield* CompareTypedArrayElements(x, y, comparator);
  };
  const sortedList = Q(yield* SortIndexedProperties(obj, len, SortCompare, 'read-through-holes'));
  let j = 0;
  while (j < len) {
    X(TypedArraySetElement(obj, F(j), sortedList[j]));
    j += 1;
  }
  return obj;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.subarray */
function* TypedArrayProto_subarray([start = Value.undefined, end = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  Q(RequireInternalSlot(obj, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in obj);
  const buffer = obj.ViewedArrayBuffer as ArrayBufferObject;
  const sourceRecord = MakeTypedArrayWithBufferWitnessRecord(obj, 'seq-cst');
  let sourceLength;
  if (IsTypedArrayOutOfBounds(sourceRecord)) {
    sourceLength = 0;
  } else {
    sourceLength = TypedArrayLength(sourceRecord);
  }
  const startIndex = Q(yield* ToClampedIndex(start, sourceLength));
  const elementSize = TypedArrayElementSize(obj);
  const srcByteOffset = obj.ByteOffset;
  const beginByteOffset = srcByteOffset + (startIndex * elementSize);
  if (obj.ArrayLength === 'auto' && end === Value.undefined) {
    return Q(yield* TypedArraySpeciesCreate(obj, [buffer, F(beginByteOffset)]));
  }
  const endIndex = end === Value.undefined ? sourceLength : Q(yield* ToClampedIndex(end, sourceLength));
  const newLength = Math.max(endIndex - startIndex, 0);
  return Q(yield* TypedArraySpeciesCreate(obj, [buffer, F(beginByteOffset), F(newLength)]));
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.tolocalestring */
function* TypedArrayProto_toLocaleString(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  const separator = ',';
  let result = '';
  let k = 0;
  while (k < length) {
    if (k > 0) result = `${result}${separator}`;
    const element = TypedArrayGetElement(obj, F(k));
    if (element !== Value.undefined) {
      const elementString = Q(yield* ToString(Q(yield* Invoke(element, 'toLocaleString'))));
      result += elementString;
    }
    k += 1;
  }
  return Value(result);
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.toreversed */
function* TypedArrayProto_toReversed(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const length = TypedArrayLength(taRecord);
  const resultArray = Q(yield* TypedArrayCreateSameType(obj, length));
  let k = 0;
  while (k < length) {
    const from = length - k - 1;
    const fromValue = TypedArrayGetElement(obj, F(from));
    X(TypedArraySetElement(resultArray, F(k), fromValue));
    k += 1;
  }
  return resultArray;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.tosorted */
function* TypedArrayProto_toSorted([comparator = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  if (comparator !== Value.undefined && !IsCallable(comparator)) {
    return Throw.TypeError('comparator ($1) is not a function', comparator);
  }
  const obj = thisValue as TypedArrayObject;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  const len = TypedArrayLength(taRecord);
  const resultArray = Q(yield* TypedArrayCreateSameType(obj, len));
  const SortCompare = function* SortCompare(x: Value, y: Value): ValueEvaluator<NumberValue> {
    Assert(x instanceof NumberValue || x instanceof BigIntValue);
    Assert(y instanceof NumberValue || y instanceof BigIntValue);
    return yield* CompareTypedArrayElements(x, y, comparator);
  };
  const sortedList = Q(yield* SortIndexedProperties(obj, len, SortCompare, 'read-through-holes'));
  let j = 0;
  while (j < len) {
    X(TypedArraySetElement(resultArray, F(j), sortedList[j]));
    j += 1;
  }
  return resultArray;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.values */
function TypedArrayProto_values(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = thisValue as TypedArrayObject;
  Q(ValidateTypedArray(obj, 'seq-cst'));
  return CreateArrayIterator(obj, 'value');
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.with */
function* TypedArrayProto_with([index = Value.undefined, value = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = thisValue;
  const taRecord = Q(ValidateTypedArray(obj, 'seq-cst'));
  __ts_cast__<TypedArrayObject>(obj);
  const length = TypedArrayLength(taRecord);
  const actualIndex = Q(yield* ToAbsoluteIndex(index, length));
  let numericValue;
  if (obj.ContentType === 'BigInt') {
    numericValue = Q(yield* ToBigInt(value));
  } else {
    numericValue = Q(yield* ToNumber(value));
  }
  if (!IsValidIntegerIndex(obj, F(actualIndex))) {
    return Throw.RangeError('TypedArray index out of bounds');
  }
  const resultArray = Q(yield* TypedArrayCreateSameType(obj, length));
  let k = 0;
  while (k < length) {
    let fromValue;
    if (k === actualIndex) {
      fromValue = numericValue;
    } else {
      fromValue = TypedArrayGetElement(obj, F(k));
    }
    X(TypedArraySetElement(resultArray, F(k), fromValue));
    k += 1;
  }
  return resultArray;
}

/** https://tc39.es/ecma262/#sec-get-%typedarray%.prototype-@@tostringtag */
function TypedArrayProto_toStringTag(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = thisValue as TypedArrayObject;
  if (!(obj instanceof ObjectValue)) {
    return Value.undefined;
  }
  if (!('TypedArrayName' in obj)) {
    return Value.undefined;
  }
  const name = obj.TypedArrayName;
  Assert(typeof name === 'string');
  return Value(name);
}

export function bootstrapTypedArrayPrototype(realmRec: Realm) {
  const ArrayProto_toString = X(Get(realmRec.Intrinsics['%Array.prototype%'], 'toString'));
  Assert(ArrayProto_toString instanceof ObjectValue);

  const proto = bootstrapPrototype(realmRec, [
    ['at', TypedArrayProto_at, 1],
    ['buffer', [TypedArrayProto_buffer]],
    ['byteLength', [TypedArrayProto_byteLength]],
    ['byteOffset', [TypedArrayProto_byteOffset]],
    ['copyWithin', TypedArrayProto_copyWithin, 2],
    ['entries', TypedArrayProto_entries, 0],
    ['every', TypedArrayProto_every, 1],
    ['fill', TypedArrayProto_fill, 1],
    ['filter', TypedArrayProto_filter, 1],
    ['find', TypedArrayProto_find, 1],
    ['findIndex', TypedArrayProto_findIndex, 1],
    ['findLast', TypedArrayProto_findLast, 1],
    ['findLastIndex', TypedArrayProto_findLastIndex, 1],
    ['forEach', TypedArrayProto_forEach, 1],
    ['includes', TypedArrayProto_includes, 1],
    ['indexOf', TypedArrayProto_indexOf, 1],
    ['join', TypedArrayProto_join, 1],
    ['keys', TypedArrayProto_keys, 0],
    ['lastIndexOf', TypedArrayProto_lastIndexOf, 1],
    ['length', [TypedArrayProto_length]],
    ['map', TypedArrayProto_map, 1],
    ['reduce', TypedArrayProto_reduce, 1],
    ['reduceRight', TypedArrayProto_reduceRight, 1],
    ['reverse', TypedArrayProto_reverse, 0],
    ['set', TypedArrayProto_set, 1],
    ['slice', TypedArrayProto_slice, 2],
    ['some', TypedArrayProto_some, 1],
    ['sort', TypedArrayProto_sort, 1],
    ['subarray', TypedArrayProto_subarray, 2],
    ['toLocaleString', TypedArrayProto_toLocaleString, 0],
    ['toReversed', TypedArrayProto_toReversed, 0],
    ['toSorted', TypedArrayProto_toSorted, 1],
    ['toString', ArrayProto_toString],
    ['values', TypedArrayProto_values, 0],
    ['with', TypedArrayProto_with, 2],
    [wellKnownSymbols.toStringTag, [TypedArrayProto_toStringTag]],
  ], realmRec.Intrinsics['%Object.prototype%']);

  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype-@@iterator */
  {
    const fn = X(Get(proto, 'values'));
    X(proto.DefineOwnProperty(wellKnownSymbols.iterator, Descriptor({
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    })));
  }

  realmRec.Intrinsics['%TypedArray.prototype%'] = proto;
}
