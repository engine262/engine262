import { Q } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { msg } from '../helpers.mjs';
import { Type, Value } from '../value.mjs';
import {
  AllocateArrayBuffer,
  Assert,
  Construct,
  GetIterator,
  GetPrototypeFromConstructor,
  IntegerIndexedObjectCreate,
  IsDetachedBuffer,
  IteratorStep,
  IteratorValue,
  SpeciesConstructor,
  ToInt16,
  ToInt32,
  ToInt8,
  ToUint16,
  ToUint32,
  ToUint8,
  ToUint8Clamp,
  RequireInternalSlot,
} from './all.mjs';

// 22.2 #sec-typedarray-objects
export const typedArrayInfo = new Map([
  ['Int8Array', {
    Intrinsic: '%Int8Array%', ElementType: 'Int8', ElementSize: 1, ConversionOperation: ToInt8,
  }],
  ['Uint8Array', {
    Intrinsic: '%Uint8Array%', ElementType: 'Uint8', ElementSize: 1, ConversionOperation: ToUint8,
  }],
  ['Uint8ClampedArray', {
    Intrinsic: '%Uint8ClampedArray%', ElementType: 'Uint8C', ElementSize: 1, ConversionOperation: ToUint8Clamp,
  }],
  ['Int16Array', {
    Intrinsic: '%Int16Array%', ElementType: 'Int16', ElementSize: 2, ConversionOperation: ToInt16,
  }],
  ['Uint16Array', {
    Intrinsic: '%Uint16Array%', ElementType: 'Uint16', ElementSize: 2, ConversionOperation: ToUint16,
  }],
  ['Int32Array', {
    Intrinsic: '%Int32Array%', ElementType: 'Int32', ElementSize: 4, ConversionOperation: ToInt32,
  }],
  ['Uint32Array', {
    Intrinsic: '%Uint32Array%', ElementType: 'Uint32', ElementSize: 4, ConversionOperation: ToUint32,
  }],
  ['Float32Array', { Intrinsic: '%Float32Array%', ElementType: 'Float32', ElementSize: 4 }],
  ['Float64Array', { Intrinsic: '%Float64Array%', ElementType: 'Float64', ElementSize: 8 }],
]);

export const numericTypeInfo = new Map([...typedArrayInfo.values()].map((info) => [info.ElementType, info]));

// 22.2.2.1.1 #sec-iterabletolist
export function IterableToList(items, method) {
  const iteratorRecord = Q(GetIterator(items, 'sync', method));
  const values = [];
  let next = Value.true;
  while (next !== Value.false) {
    next = Q(IteratorStep(iteratorRecord));
    if (next !== Value.false) {
      const nextValue = Q(IteratorValue(next));
      values.push(nextValue);
    }
  }
  return values;
}

// 22.2.3.5.1 #sec-validatetypedarray
export function ValidateTypedArray(O) {
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in O);
  const buffer = O.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
  }
  return buffer;
}

// 22.2.4.2.1 #sec-allocatetypedarray
export function AllocateTypedArray(constructorName, newTarget, defaultProto, length) {
  const proto = Q(GetPrototypeFromConstructor(newTarget, defaultProto));
  const obj = IntegerIndexedObjectCreate(proto, ['ViewedArrayBuffer', 'TypedArrayName', 'ByteLength', 'ByteOffset', 'ArrayLength']);
  Assert(obj.ViewedArrayBuffer === Value.undefined);
  obj.TypedArrayName = constructorName;
  if (length === undefined) {
    obj.ByteLength = new Value(0);
    obj.ByteOffset = new Value(0);
    obj.ArrayLength = new Value(0);
  } else {
    Q(AllocateTypedArrayBuffer(obj, length));
  }
  return obj;
}

// 22.2.4.2.2 #sec-allocatetypedarraybuffer
export function AllocateTypedArrayBuffer(O, length) {
  Assert(Type(O) === 'Object' && 'ViewedArrayBuffer' in O);
  Assert(O.ViewedArrayBuffer === Value.undefined);
  Assert(length.numberValue() >= 0);
  const constructorName = O.TypedArrayName.stringValue();
  const elementSize = typedArrayInfo.get(constructorName).ElementSize;
  const byteLength = new Value(elementSize * length.numberValue());
  const data = Q(AllocateArrayBuffer(surroundingAgent.intrinsic('%ArrayBuffer%'), byteLength));
  O.ViewedArrayBuffer = data;
  O.ByteLength = byteLength;
  O.ByteOffset = new Value(0);
  O.ArrayLength = length;
  return O;
}

// 22.2.4.6 #typedarray-create
export function TypedArrayCreate(constructor, argumentList) {
  const newTypedArray = Q(Construct(constructor, argumentList));
  Q(ValidateTypedArray(newTypedArray));
  if (argumentList.length === 1 && Type(argumentList[0]) === 'Number') {
    if (newTypedArray.ArrayLength.numberValue() < argumentList[0].numberValue()) {
      return surroundingAgent.Throw('TypeError', msg('TypedArrayTooSmall', newTypedArray.ArrayLength, argumentList[0]));
    }
  }
  return newTypedArray;
}

// 22.2.4.7 #typedarray-species-create
export function TypedArraySpeciesCreate(exemplar, argumentList) {
  Assert(Type(exemplar) === 'Object' && 'TypedArrayName' in exemplar);
  const intrinsicName = typedArrayInfo.get(exemplar.TypedArrayName.stringValue()).Intrinsic;
  const defaultConstructor = surroundingAgent.intrinsic(intrinsicName);
  const constructor = Q(SpeciesConstructor(exemplar, defaultConstructor));
  return Q(TypedArrayCreate(constructor, argumentList));
}
