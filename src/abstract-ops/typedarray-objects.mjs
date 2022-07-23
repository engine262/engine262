import { surroundingAgent } from '../engine.mjs';
import { Type, Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import {
  Assert,
  ToInt8,
  ToUint8,
  ToUint8Clamp,
  ToInt16,
  ToUint16,
  ToInt32,
  ToUint32,
  ToBigInt64,
  ToBigUint64,
  RequireInternalSlot,
  Construct,
  GetIterator,
  IteratorStep,
  IteratorValue,
  SpeciesConstructor,
  IsDetachedBuffer,
  isNonNegativeInteger,
  IntegerIndexedObjectCreate,
  GetPrototypeFromConstructor,
  AllocateArrayBuffer,
} from './all.mjs';

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
};

export const typedArrayInfoByType = {};
Object.values(typedArrayInfoByName).forEach((v) => {
  typedArrayInfoByType[v.ElementType] = v;
});

// #sec-validatetypedarray
export function ValidateTypedArray(O) {
  // 1. Perform ? RequireInternalSlot(O, [[TypedArrayName]]).
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  // 2. Assert: O has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in O);
  // 3. Let buffer be O.[[ViewedArrayBuffer]].
  const buffer = O.ViewedArrayBuffer;
  // 4. If IsDetachedBuffer(buffer) is true, throw a TypeError exception.
  if (IsDetachedBuffer(buffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 5. Return buffer.
  return buffer;
}

// #typedarray-create
export function TypedArrayCreate(constructor, argumentList) {
  // 1. Let newTypedArray be ? Construct(constructor, argumentList).
  const newTypedArray = Q(Construct(constructor, argumentList));
  // 2. Perform ? ValidateTypedArray(newTypedArray).
  Q(ValidateTypedArray(newTypedArray));
  // 3. If argumentList is a List of a single Number, then
  if (argumentList.length === 1 && Type(argumentList[0]) === 'Number') {
    // a. If newTypedArray.[[ArrayLength]] < argumentList[0], throw a TypeError exception.
    if (newTypedArray.ArrayLength < argumentList[0].numberValue()) {
      return surroundingAgent.Throw('TypeError', 'TypedArrayTooSmall');
    }
  }
  // 4. Return newTypedArray.
  return newTypedArray;
}

// #sec-allocatetypedarray
export function AllocateTypedArray(constructorName, newTarget, defaultProto, length) {
  // 1. Let proto be ? GetPrototypeFromConstructor(newTarget, defaultProto).
  const proto = Q(GetPrototypeFromConstructor(newTarget, defaultProto));
  // 2. Let obj be ! IntegerIndexedObjectCreate(proto).
  const obj = X(IntegerIndexedObjectCreate(proto));
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
    Q(AllocateTypedArrayBuffer(obj, length));
  }
  // 9. Return obj.
  return obj;
}

// #sec-allocatetypedarraybuffer
export function AllocateTypedArrayBuffer(O, length) {
  // 1. Assert: O is an Object that has a [[ViewedArrayBuffer]] internal slot.
  Assert(Type(O) === 'Object' && 'ViewedArrayBuffer' in O);
  // 2. Assert: O.[[ViewedArrayBuffer]] is undefined.
  Assert(O.ViewedArrayBuffer === Value.undefined);
  // 3. Assert: length is a non-negative integer.
  Assert(isNonNegativeInteger(length));
  // 4. Let constructorName be the String value of O.[[TypedArrayName]].
  const constructorName = O.TypedArrayName.stringValue();
  // 5. Let elementSize be the Element Size value specified in Table 61 for constructorName.
  const elementSize = typedArrayInfoByName[constructorName].ElementSize;
  // 6. Let byteLength be elementSize × length.
  const byteLength = elementSize * length;
  // 7. Let data be ? AllocateArrayBuffer(%ArrayBuffer%, byteLength).
  const data = Q(AllocateArrayBuffer(surroundingAgent.intrinsic('%ArrayBuffer%'), byteLength));
  // 8. Set O.[[ViewedArrayBuffer]] to data.
  O.ViewedArrayBuffer = data;
  // 9. Set O.[[ByteLength]] to byteLength.
  O.ByteLength = byteLength;
  // 10. Set O.[[ByteOffset]] to 0.
  O.ByteOffset = 0;
  // 11. Set O.[[ArrayLength]] to length.
  O.ArrayLength = length;
  // 12. Return O.
  return O;
}

// #typedarray-species-create
export function TypedArraySpeciesCreate(exemplar, argumentList) {
  // 1. Assert: exemplar is an Object that has [[TypedArrayName]] and [[ContentType]] internal slots.
  Assert(Type(exemplar) === 'Object'
         && 'TypedArrayName' in exemplar
         && 'ContentType' in exemplar);
  // 2. Let defaultConstructor be the intrinsic object listed in column one of Table 61 for exemplar.[[TypedArrayName]].
  const defaultConstructor = surroundingAgent.intrinsic(typedArrayInfoByName[exemplar.TypedArrayName.stringValue()].IntrinsicName);
  // 3. Let constructor be ? SpeciesConstructor(exemplar, defaultConstructor).
  const constructor = Q(SpeciesConstructor(exemplar, defaultConstructor));
  // 4. Let result be ? TypedArrayCreate(constructor, argumentList).
  const result = Q(TypedArrayCreate(constructor, argumentList));
  // 5. Assert: result has [[TypedArrayName]] and [[ContentType]] internal slots.
  Assert('TypedArrayName' in result && 'ContentType' in result);
  // 6. If result.[[ContentType]] is not equal to exemplar.[[ContentType]], throw a TypeError exception.
  if (result.ContentType !== exemplar.ContentType) {
    return surroundingAgent.Throw('TypeError', 'BufferContentTypeMismatch');
  }
  // 7. Return result.
  return result;
}

// #sec-iterabletolist
export function IterableToList(items, method) {
  // 1. Let iteratorRecord be ? GetIterator(items, sync, method).
  const iteratorRecord = Q(GetIterator(items, 'sync', method));
  // 2. Let values be a new empty List.
  const values = [];
  // 3. Let next be true.
  let next = Value.true;
  // 4. Repeat, while next is not false
  while (next !== Value.false) {
    // a. Set next to ? IteratorStep(iteratorRecord).
    next = Q(IteratorStep(iteratorRecord));
    // b. If next is not false, then
    if (next !== Value.false) {
      // i. Let nextValue be ? IteratorValue(next).
      const nextValue = Q(IteratorValue(next));
      // ii. Append nextValue to the end of the List values.
      values.push(nextValue);
    }
  }
  // 5. Return values.
  return values;
}
